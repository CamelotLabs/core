pragma solidity >=0.6.2;

import "forge-std/Test.sol";
import "../contracts/interfaces/ICamelotPair.sol";

string constant camelotV2PairJson = "out/CamelotPair.sol/CamelotPair.json";

// To debug getAmountOut function, add custom events to source code.
contract GetAmountOutTest is Test {
    address token0 = 0x0Ae38f7E10A43B5b2fB064B42a2f4514cbA909ef;
    address token1 = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address pool = 0x29fC01f04032c76cA40f353c7dF685f4444c15eD;

    function setUp() public {
        vm.createSelectFork("arb-main", 213481354);

        ICamelotPair camelotPair = ICamelotPair(deployCode(camelotV2PairJson));
        vm.etch(pool, address(camelotPair).code);
    }

    function test_getAmountOut() public view {
        address tokenIn = token0;
        uint256 amountIn = 5192296858534827628530496329220095;

        uint256 amountOut = ICamelotPair(pool).getAmountOut(amountIn, tokenIn);
        assertGt(amountOut, 0);
    }
}
