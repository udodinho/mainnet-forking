import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";

    await helpers.impersonateAccount(TOKEN_HOLDER);
    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    const amountADesired = ethers.parseUnits("80000", 6);
    const amountBDesired = ethers.parseUnits("1400000", 18);
    const amountAMin = ethers.parseUnits('0.1', 6);
    const amountBMin = ethers.parseUnits('0.1', 18);
    
    const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
    const DAI_Contract = await ethers.getContractAt("IERC20", DAI, impersonatedSigner);
    const deadline = Math.floor(Date.now() / 1000) + (60 * 10);
    
    const ROUTER = await ethers.getContractAt("IUniswapV2Router", ROUTER_ADDRESS, impersonatedSigner);
    const FACTORY = await ethers.getContractAt("IUniswapV2Factory", UNISWAP_V2_FACTORY, impersonatedSigner);

    // Approve tokens for adding liquidity
    await USDC_Contract.approve(ROUTER_ADDRESS, amountADesired);
    await DAI_Contract.approve(ROUTER_ADDRESS, amountBDesired);
    
    // Get the LP token (pair) address for USDC/DAI
    const LP_TOKEN_ADDRESS = await FACTORY.getPair(USDC, DAI);

    // Add liquidity
    await ROUTER.addLiquidity(
        USDC,
        DAI,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        impersonatedSigner.address,
        deadline
    );

    // Get LP token contract and balance
    const lpToken = await ethers.getContractAt("IERC20", LP_TOKEN_ADDRESS, impersonatedSigner);
    const lpBalance = await lpToken.balanceOf(impersonatedSigner.address);
    console.log("LP Token Balance:", ethers.formatUnits(lpBalance, 18));

    const liquidityToRemove = lpBalance;

    // Check allowance before approving
    let allowance = await lpToken.allowance(impersonatedSigner.address, ROUTER_ADDRESS);
    console.log("Allowance:", ethers.formatUnits(allowance, 18));

    // Approve Uniswap router to spend your LP tokens if necessary
    if (allowance < liquidityToRemove) {
        const approveTx = await lpToken.approve(ROUTER_ADDRESS, liquidityToRemove);
        await approveTx.wait();
        console.log("LP tokens approved");
        
        // Re-check allowance after approval
        allowance = await lpToken.allowance(impersonatedSigner.address, ROUTER_ADDRESS);
        console.log("Updated Allowance:", ethers.formatUnits(allowance, 18));
        console.log("***********************************************************");
        console.log("***********************************************************");
    }

    // Check balances before removing liquidity
    const usdcBalBefore = await USDC_Contract.balanceOf(impersonatedSigner.address);
    const daiBalBefore = await DAI_Contract.balanceOf(impersonatedSigner.address);

    console.log("USDC balance before removing liquidity:", Number(usdcBalBefore));
    console.log("DAI balance before removing liquidity:", Number(daiBalBefore));

    // Remove liquidity
    await ROUTER.removeLiquidity(
        USDC,
        DAI,
        liquidityToRemove,
        amountAMin,
        amountBMin,
        impersonatedSigner.address,
        deadline
    );

    // Check balances after removing liquidity
    const usdcBalAfter = await USDC_Contract.balanceOf(impersonatedSigner.address);
    const daiBalAfter = await DAI_Contract.balanceOf(impersonatedSigner.address);

    console.log("=========================================================");
    console.log("USDC balance after removing liquidity:", Number(usdcBalAfter));
    console.log("DAI balance after removing liquidity:", Number(daiBalAfter));
}

// Execute the main function and handle errors
main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
});