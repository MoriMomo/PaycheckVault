// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDEX {
    // 1 inToken = rate * outToken / 1e18
    uint256 public rate;
    mapping(bytes32 => uint256) public pairRates;

    event Swapped(
        address indexed caller,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event PairRateUpdated(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 rate
    );

    constructor(uint256 _initialRate) {
        rate = _initialRate;
    }

    function setRate(uint256 _newRate) external {
        rate = _newRate;
    }

    function setPairRate(address tokenIn, address tokenOut, uint256 _rate) external {
        pairRates[keccak256(abi.encodePacked(tokenIn, tokenOut))] = _rate;
        emit PairRateUpdated(tokenIn, tokenOut, _rate);
    }

    function getRate(address tokenIn, address tokenOut) public view returns (uint256) {
        uint256 customRate = pairRates[keccak256(abi.encodePacked(tokenIn, tokenOut))];
        return customRate > 0 ? customRate : rate;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 activeRate = getRate(tokenIn, tokenOut);
        amountOut = (amountIn * activeRate) / 1e18;
        if (amountOut == 0) {
            amountOut = amountIn; // fallback 1:1 if rate precision too small
        }

        IERC20(tokenOut).transfer(recipient, amountOut);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
