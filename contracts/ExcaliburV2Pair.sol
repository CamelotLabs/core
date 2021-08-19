pragma solidity =0.5.16;

import './interfaces/IExcaliburV2Pair.sol';
import './UniswapV2ERC20.sol';
import './libraries/Math.sol';
import './libraries/UQ112x112.sol';
import './interfaces/IERC20.sol';
import './interfaces/IExcaliburV2Factory.sol';
import './interfaces/IUniswapV2Callee.sol';

contract ExcaliburV2Pair is IExcaliburV2Pair, UniswapV2ERC20 {
  using SafeMath  for uint;
  using UQ112x112 for uint224;

  uint public constant MINIMUM_LIQUIDITY = 10 ** 3;
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

  address public factory;
  address public token0;
  address public token1;

  uint public constant FEE_DENOMINATOR = 100000;
  uint public constant MAX_FEE_AMOUNT = 2000; // = 2%
  uint public constant MIN_FEE_AMOUNT = 10; // = 0.01%
  uint public feeAmount = 150; // default = 0.15%

  uint112 private reserve0;           // uses single storage slot, accessible via getReserves
  uint112 private reserve1;           // uses single storage slot, accessible via getReserves
  uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

  uint public price0CumulativeLast;
  uint public price1CumulativeLast;
  uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

  uint private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, 'ExcaliburV2Pair: LOCKED');
    unlocked = 0;
    _;
    unlocked = 1;
  }

  function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
    _blockTimestampLast = blockTimestampLast;
  }

  function _safeTransfer(address token, address to, uint value) private {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'ExcaliburV2Pair: TRANSFER_FAILED');
  }

  event FeeAmountUpdated(uint prevFeeAmount, uint feeAmount);
  event Mint(address indexed sender, uint amount0, uint amount1);
  event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
  event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In,
    uint amount0Out,
    uint amount1Out,
    address indexed to
  );
  event Sync(uint112 reserve0, uint112 reserve1);

  constructor() public {
    factory = msg.sender;
  }

  // called once by the factory at time of deployment
  function initialize(address _token0, address _token1) external {
    require(msg.sender == factory, 'ExcaliburV2Pair: FORBIDDEN');
    // sufficient check
    token0 = _token0;
    token1 = _token1;
  }

  /**
  * @dev update the amount of fee taken on swap
  *
  * Can only be called by the factory's owner
  */
  function setFeeAmount(uint newFeeAmount) external {
    require(msg.sender == IExcaliburV2Factory(factory).owner(), "ExcaliburV2Pair: only factory's owner");
    // sufficient check
    require(newFeeAmount <= MAX_FEE_AMOUNT, "ExcaliburV2Pair: feeAmount mustn't exceed the maximum");
    require(newFeeAmount >= MIN_FEE_AMOUNT, "ExcaliburV2Pair: feeAmount mustn't exceed the minimum");
    uint prevFeeAmount = feeAmount;
    feeAmount = newFeeAmount;
    emit FeeAmountUpdated(prevFeeAmount, feeAmount);
  }

  // update reserves and, on the first call per block, price accumulators
  function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
    require(balance0 <= uint112(- 1) && balance1 <= uint112(- 1), 'ExcaliburV2Pair: OVERFLOW');
    uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
    uint32 timeElapsed = blockTimestamp - blockTimestampLast;
    // overflow is desired
    if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
      // * never overflows, and + overflow is desired
      price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
      price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
    }
    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
    blockTimestampLast = blockTimestamp;
    emit Sync(reserve0, reserve1);
  }

  // if fee is on, mint liquidity equivalent to "factory.ownerFeeShare()" of the growth in sqrt(k)
  function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
    address feeTo = IExcaliburV2Factory(factory).feeTo();
    feeOn = feeTo != address(0);
    uint _kLast = kLast;
    // gas savings
    if (feeOn) {
      if (_kLast != 0) {
        uint rootK = Math.sqrt(uint(_reserve0).mul(_reserve1));
        uint rootKLast = Math.sqrt(_kLast);
        if (rootK > rootKLast) {
          uint d = (FEE_DENOMINATOR / IExcaliburV2Factory(factory).ownerFeeShare()).sub(1);
          uint numerator = totalSupply.mul(rootK.sub(rootKLast));
          uint denominator = rootK.mul(d).add(rootKLast);
          uint liquidity = numerator / denominator;
          if (liquidity > 0) _mint(feeTo, liquidity);
        }
      }
    } else if (_kLast != 0) {
      kLast = 0;
    }
  }

  // this low-level function should be called from a contract which performs important safety checks
  function mint(address to) external lock returns (uint liquidity) {
    (uint112 _reserve0, uint112 _reserve1,) = getReserves();
    // gas savings
    uint balance0 = IERC20(token0).balanceOf(address(this));
    uint balance1 = IERC20(token1).balanceOf(address(this));
    uint amount0 = balance0.sub(_reserve0);
    uint amount1 = balance1.sub(_reserve1);

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint _totalSupply = totalSupply;
    // gas savings, must be defined here since totalSupply can update in _mintFee
    if (_totalSupply == 0) {
      liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
      _mint(address(0), MINIMUM_LIQUIDITY);
      // permanently lock the first MINIMUM_LIQUIDITY tokens
    } else {
      liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
    }
    require(liquidity > 0, 'ExcaliburV2Pair: INSUFFICIENT_LIQUIDITY_MINTED');
    _mint(to, liquidity);

    _update(balance0, balance1, _reserve0, _reserve1);
    if (feeOn) kLast = uint(reserve0).mul(reserve1);
    // reserve0 and reserve1 are up-to-date
    emit Mint(msg.sender, amount0, amount1);
  }

  // this low-level function should be called from a contract which performs important safety checks
  function burn(address to) external lock returns (uint amount0, uint amount1) {
    (uint112 _reserve0, uint112 _reserve1,) = getReserves();
    // gas savings
    address _token0 = token0;
    // gas savings
    address _token1 = token1;
    // gas savings
    uint balance0 = IERC20(_token0).balanceOf(address(this));
    uint balance1 = IERC20(_token1).balanceOf(address(this));
    uint liquidity = balanceOf[address(this)];

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint _totalSupply = totalSupply;
    // gas savings, must be defined here since totalSupply can update in _mintFee
    amount0 = liquidity.mul(balance0) / _totalSupply;
    // using balances ensures pro-rata distribution
    amount1 = liquidity.mul(balance1) / _totalSupply;
    // using balances ensures pro-rata distribution
    require(amount0 > 0 && amount1 > 0, 'ExcaliburV2Pair: INSUFFICIENT_LIQUIDITY_BURNED');
    _burn(address(this), liquidity);
    _safeTransfer(_token0, to, amount0);
    _safeTransfer(_token1, to, amount1);
    balance0 = IERC20(_token0).balanceOf(address(this));
    balance1 = IERC20(_token1).balanceOf(address(this));

    _update(balance0, balance1, _reserve0, _reserve1);
    if (feeOn) kLast = uint(reserve0).mul(reserve1);
    // reserve0 and reserve1 are up-to-date
    emit Burn(msg.sender, amount0, amount1, to);
  }

  // this low-level function should be called from a contract which performs important safety checks
  function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
    require(amount0Out > 0 || amount1Out > 0, 'ExcaliburV2Pair: INSUFFICIENT_OUTPUT_AMOUNT');
    (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
    require(amount0Out < _reserve0 && amount1Out < _reserve1, 'ExcaliburV2Pair: INSUFFICIENT_LIQUIDITY');

    uint balance0;
    uint balance1;
    { // scope for _token{0,1}, avoids stack too deep errors
      address _token0 = token0;
      address _token1 = token1;
      require(to != _token0 && to != _token1, 'ExcaliburV2Pair: INVALID_TO');
      if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
      if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
      if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
      balance0 = IERC20(_token0).balanceOf(address(this));
      balance1 = IERC20(_token1).balanceOf(address(this));
    }
    uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
    uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
    require(amount0In > 0 || amount1In > 0, 'ExcaliburV2Pair: INSUFFICIENT_INPUT_AMOUNT');
    { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
      uint feeDenominator = FEE_DENOMINATOR;
      uint _feeAmount = feeAmount;
      uint balance0Adjusted = balance0.mul(feeDenominator).sub(amount0In.mul(_feeAmount));
      uint balance1Adjusted = balance1.mul(feeDenominator).sub(amount1In.mul(_feeAmount));
      require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(feeDenominator**2), 'ExcaliburV2Pair: K');
    }

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  // this low-level function should be called from a contract which performs important safety checks
  function swap2(uint amount0Out, uint amount1Out, address to, address referrer, bool hasPaidFeesWithEXC) external lock {
    require(amount0Out > 0 || amount1Out > 0, 'ExcaliburV2Pair: INSUFFICIENT_OUTPUT_AMOUNT');
    require(amount0Out < reserve0 && amount1Out < reserve1, 'ExcaliburV2Pair: INSUFFICIENT_LIQUIDITY');
    uint balance0;
    uint balance1;
    uint _feeAmount = feeAmount;
    uint feeDenominator = FEE_DENOMINATOR;
    if (msg.sender == IExcaliburV2Factory(factory).trustableRouter() && hasPaidFeesWithEXC) _feeAmount = (50 * _feeAmount) / 100;
    {// scope for _token{0,1}, avoids stack too deep errors
      address _token0 = token0;
      address _token1 = token1;
      require(to != _token0 && to != _token1, 'ExcaliburV2Pair: INVALID_TO');
      // optimistically transfer tokens
      if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
      // optimistically transfer tokens
      if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
      balance0 = IERC20(_token0).balanceOf(address(this));
      balance1 = IERC20(_token1).balanceOf(address(this));
    }
    uint amount0In = balance0 > reserve0 - amount0Out ? balance0 - (reserve0 - amount0Out) : 0;
    uint amount1In = balance1 > reserve1 - amount1Out ? balance1 - (reserve1 - amount1Out) : 0;
    require(amount0In > 0 || amount1In > 0, 'ExcaliburV2Pair: INSUFFICIENT_INPUT_AMOUNT');
    {// scope for reserve{0,1}Adjusted, avoids stack too deep errors
      uint balance0Adjusted = balance0.mul(feeDenominator).sub(amount0In.mul(_feeAmount));
      uint balance1Adjusted = balance1.mul(feeDenominator).sub(amount1In.mul(_feeAmount));
      require(balance0Adjusted.mul(balance1Adjusted) >= uint(reserve0).mul(reserve1).mul(feeDenominator ** 2), 'ExcaliburV2Pair: K');
    }
    {// scope for referer management
      uint referrerInputFeeAmount = IExcaliburV2Factory(factory).referrersFeeShare(referrer).mul(_feeAmount);
      if (referrerInputFeeAmount > 0) {
        if (amount0In > 0) {
          address _token0 = token0;
          _safeTransfer(_token0, referrer, amount0In.mul(referrerInputFeeAmount) / (feeDenominator ** 2));
          balance0 = IERC20(_token0).balanceOf(address(this));
        }
        if (amount1In > 0) {
          address _token1 = token1;
          _safeTransfer(_token1, referrer, amount1In.mul(referrerInputFeeAmount) / (feeDenominator ** 2));
          balance1 = IERC20(_token1).balanceOf(address(this));
        }
      }
    }
    _update(balance0, balance1, reserve0, reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  // force balances to match reserves
  function skim(address to) external lock {
    address _token0 = token0;
    // gas savings
    address _token1 = token1;
    // gas savings
    _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)).sub(reserve0));
    _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)).sub(reserve1));
  }

  // force reserves to match balances
  function sync() external lock {
    uint token0Balance = IERC20(token0).balanceOf(address(this));
    uint token1Balance = IERC20(token1).balanceOf(address(this));
    require(token0Balance != 0 && token1Balance != 0, "ExcaliburV2Pair: liquidity ratio not initialized");
    _update(token0Balance, token1Balance, reserve0, reserve1);
  }

  /**
  * @dev Allow to recover token sent here by mistake
  *
  * Can only be called by factory's owner
  */
  function drainWrongToken(address token, address to) external {
    require(msg.sender == IExcaliburV2Factory(factory).owner(), "ExcaliburV2Pair: only factory's owner");
    require(token != token0 && token != token1, "ExcaliburV2Pair: invalid token");
    _safeTransfer(token, to, IERC20(token).balanceOf(address(this)));
  }
}