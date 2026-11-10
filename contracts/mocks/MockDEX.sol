// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDEX {
    // 1 inToken = rate * outToken / 1e18
    uint256 public rate; // e.g. 1e18 for 1:1, or 0.0005e18 for ETH/USDC

    event Swapped(
        address indexed caller,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(uint256 _initialRate) {
        rate = _initialRate;
    }

    function setRate(uint256 _newRate) external {
        rate = _newRate;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // amountOut = (amountIn * rate) / 1e18
        amountOut = (amountIn * rate) / 1e18;
        if (amountOut == 0) {
            amountOut = amountIn; // fallback 1:1 if rate precision too small
        }

        IERC20(tokenOut).transfer(recipient, amountOut);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
