import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'
import { BigNumber, bigNumberify } from 'ethers/utils'

import { expandTo18Decimals, mineBlock, encodePrice } from './shared/utilities'
import { pairFixture } from './shared/fixtures'
import { AddressZero } from 'ethers/constants'

const MINIMUM_LIQUIDITY = bigNumberify(10).pow(3)

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('ExcaliburV2Pair', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [wallet])

  let factory: Contract
  let token0: Contract
  let token1: Contract
  let pair: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(pairFixture)
    factory = fixture.factory
    token0 = fixture.token0
    token1 = fixture.token1
    pair = fixture.pair
  })

  it('mint', async () => {
    const token0Amount = expandTo18Decimals(1)
    const token1Amount = expandTo18Decimals(4)
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)

    const expectedLiquidity = expandTo18Decimals(2)
    await expect(pair.mint(wallet.address, overrides))
      .to.emit(pair, 'Transfer')
      .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
      .to.emit(pair, 'Transfer')
      .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount, token1Amount)
      .to.emit(pair, 'Mint')
      .withArgs(wallet.address, token0Amount, token1Amount)

    expect(await pair.totalSupply()).to.eq(expectedLiquidity)
    expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount)
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount)
    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount)
    expect(reserves[1]).to.eq(token1Amount)
  })

  async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(wallet.address, overrides)
  }

  const swapTestCases: BigNumber[][] = [
    [1, 5, 10, '300', '1662497915624478906'],
    [1, 10, 5, '300', '453305446940074565'],
    [2, 5, 10, '300', '2851015155847869602'],
    [2, 10, 5, '300', '831248957812239453'],
    [1, 10, 10, '300', '906610893880149131'],
    [1, 100, 100, '300', '987158034397061298'],
    [1, 1000, 1000, '300', '996006981039903216'],

    [1, 5, 10, '150', '1664582812369759106'],
    [1, 10, 5, '150', '453925535300268218'],
    [2, 5, 10, '150', '2854080320137201657'],
    [2, 10, 5, '150', '832291406184879553'],
    [1, 10, 10, '150', '907851070600536436'],
    [1, 100, 100, '150', '988628543988277053'],
    [1, 1000, 1000, '150', '997503992263724670'],

    [1, 5, 10, '2000', '1638795986622073578'],
    [1, 10, 5, '2000', '446265938069216757'],
    [2, 5, 10, '2000', '2816091954022988505'],
    [2, 10, 5, '2000', '819397993311036789'],
    [1, 10, 10, '2000', '892531876138433515'],
    [1, 100, 100, '2000', '970489205783323430'],
    [1, 1000, 1000, '2000', '979040540270534875']
  ].map(a => a.map(n => (typeof n === 'string' ? bigNumberify(n) : expandTo18Decimals(n))))

  swapTestCases.forEach((swapTestCase, i) => {
    it(`getInputPrice:${i}`, async () => {
      const [swapAmount, token0Amount, token1Amount, feeAmount, expectedOutputAmount] = swapTestCase
      await pair.setFeeAmount(feeAmount)
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, swapAmount)

      // let expectedOutputNumerator = bigNumberify(100000-feeAmount.toNumber()).mul(swapAmount).mul(token1Amount)
      // let expectedOutputDenominator = token0Amount.mul(100000).add(bigNumberify(100000-feeAmount.toNumber()).mul(swapAmount))
      // let expectedOutput = expectedOutputNumerator.div(expectedOutputDenominator)
      // console.log(expectedOutput.toString())

      await expect(pair.swap(0, expectedOutputAmount.add(1), wallet.address, '0x', overrides)).to.be.revertedWith(
        'ExcaliburV2Pair: K'
      )
      await pair.swap(0, expectedOutputAmount, wallet.address, '0x', overrides)
    })
  })

  swapTestCases.forEach((swapTestCase, i) => {
    it(`swapv2:getInputPrice:${i}`, async () => {
      const [swapAmount, token0Amount, token1Amount, feeAmount, expectedOutputAmount] = swapTestCase
      await pair.setFeeAmount(feeAmount)
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, swapAmount)

      // let expectedOutputNumerator = bigNumberify(100000-feeAmount.toNumber()).mul(swapAmount).mul(token1Amount)
      // let expectedOutputDenominator = token0Amount.mul(100000).add(bigNumberify(100000-feeAmount.toNumber()).mul(swapAmount))
      // let expectedOutput = expectedOutputNumerator.div(expectedOutputDenominator)
      // console.log(expectedOutput.toString())

      await expect(
        pair.swap2(0, expectedOutputAmount.add(1), wallet.address, other.address, false, overrides)
      ).to.be.revertedWith('ExcaliburV2Pair: K')
      await pair.swap2(0, expectedOutputAmount, wallet.address, other.address, false, overrides)
    })
  })

  const swap2EXCFeePaidTestCases: BigNumber[][] = [
    [1, 5, 10, '300', '1664582812369759106'],
    [1, 10, 5, '300', '453925535300268218'],
    [2, 5, 10, '300', '2854080320137201657'],
    [2, 10, 5, '300', '832291406184879553'],
    [1, 10, 10, '300', '907851070600536436'],
    [1, 100, 100, '300', '988628543988277053'],
    [1, 1000, 1000, '300', '997503992263724670'],

    [1, 5, 10, '150', '1665624869775388590'],
    [1, 10, 5, '150', '454235516057913039'],
    [2, 5, 10, '150', '2855611916839322712'],
    [2, 10, 5, '150', '832812434887694295'],
    [1, 10, 10, '150', '908471032115826079'],
    [1, 100, 100, '150', '989363782404324784'],
    [1, 1000, 1000, '150', '998252496193178965'],

    [1, 5, 10, '2000', '1652754590984974958'],
    [1, 10, 5, '2000', '450409463148316651'],
    [2, 5, 10, '2000', '2836676217765042979'],
    [2, 10, 5, '2000', '826377295492487479'],
    [1, 10, 10, '2000', '900818926296633303'],
    [1, 100, 100, '2000', '980295078720665412'],
    [1, 1000, 1000, '2000', '989020869339354039']
  ].map(a => a.map(n => (typeof n === 'string' ? bigNumberify(n) : expandTo18Decimals(n))))
  swap2EXCFeePaidTestCases.forEach((swap2EXCFeePaidTestCases, i) => {
    it(`swapv2:getInputPrice:${i}`, async () => {
      const [swapAmount, token0Amount, token1Amount, feeAmount, expectedOutputAmount] = swap2EXCFeePaidTestCases
      await pair.setFeeAmount(feeAmount)
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, swapAmount)

      // let expectedOutputNumerator = bigNumberify(100000-feeAmount.div(2).toNumber()).mul(swapAmount).mul(token1Amount)
      // let expectedOutputDenominator = token0Amount.mul(100000).add(bigNumberify(100000-feeAmount.div(2).toNumber()).mul(swapAmount))
      // let expectedOutput = expectedOutputNumerator.div(expectedOutputDenominator)
      // console.log(expectedOutput.toString())

      await expect(
        pair.swap2(0, expectedOutputAmount, wallet.address, other.address, true, overrides)
      ).to.be.revertedWith('ExcaliburV2Pair: K')

      await factory.setTrustableRouterAddress(wallet.address)
      await expect(
        pair.swap2(0, expectedOutputAmount.add(1), wallet.address, other.address, true, overrides)
      ).to.be.revertedWith('ExcaliburV2Pair: K')
      await pair.swap2(0, expectedOutputAmount, wallet.address, other.address, true, overrides)
      await expect(await token0.balanceOf(other.address)).to.be.eq(0)
    })
  })

  swap2EXCFeePaidTestCases.forEach((swap2EXCFeePaidTestCases, i) => {
    it(`swapv2:getInputPrice:${i}`, async () => {
      const [swapAmount, token0Amount, token1Amount, feeAmount, expectedOutputAmount] = swap2EXCFeePaidTestCases
      await pair.setFeeAmount(feeAmount)
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, swapAmount)
      await factory.setTrustableRouterAddress(wallet.address)
      await factory.setRefererFeeShare(other.address, 20000)

      const expectedReferrerFees = swapAmount
        .mul(feeAmount.div(2))
        .mul(20000)
        .div(100000 ** 2)
      await pair.swap2(0, expectedOutputAmount, wallet.address, other.address, true, overrides)
      await expect(await token0.balanceOf(other.address)).to.be.eq(expectedReferrerFees)
    })
  })

  const optimisticTestCases: BigNumber[][] = [
    ['997000000000000000', 5, 10, '300', 1], // given amountIn, amountOut = floor(amountIn * .997)
    ['997000000000000000', 10, 5, '300', 1],
    ['997000000000000000', 5, 5, '300', 1],
    [1, 5, 5, '300', '1003009027081243732'], // given amountOut, amountIn = ceiling(amountOut / .997)

    ['998500000000000000', 5, 10, '150', 1], // given amountIn, amountOut = floor(amountIn * .9985)
    ['998500000000000000', 10, 5, '150', 1],
    ['998500000000000000', 5, 5, '150', 1],
    [1, 5, 5, '150', '1001502253380070106'], // given amountOut, amountIn = ceiling(amountOut / .9985)

    ['980000000000000000', 5, 10, '2000', 1], // given amountIn, amountOut = floor(amountIn * .98)
    ['980000000000000000', 10, 5, '2000', 1],
    ['980000000000000000', 5, 5, '2000', 1],
    [1, 5, 5, '2000', '1020408163265306123'] // given amountOut, amountIn = ceiling(amountOut / .98)
  ].map(a => a.map(n => (typeof n === 'string' ? bigNumberify(n) : expandTo18Decimals(n))))
  optimisticTestCases.forEach((optimisticTestCase, i) => {
    it(`optimistic:${i}`, async () => {
      const [outputAmount, token0Amount, token1Amount, feeAmount, inputAmount] = optimisticTestCase

      await pair.setFeeAmount(feeAmount)
      await addLiquidity(token0Amount, token1Amount)
      await token0.transfer(pair.address, inputAmount)
      await expect(pair.swap(outputAmount.add(1), 0, wallet.address, '0x', overrides)).to.be.revertedWith(
        'ExcaliburV2Pair: K'
      )
      await pair.swap(outputAmount, 0, wallet.address, '0x', overrides)
    })
  })

  it('swap:token0', async () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = bigNumberify('1662497915624478906')
    await token0.transfer(pair.address, swapAmount)
    await expect(pair.swap(0, expectedOutputAmount, wallet.address, '0x', overrides))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount.add(swapAmount))
    expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(swapAmount))
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).sub(swapAmount))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount))
  })

  it('swap:token1', async () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = bigNumberify('453305446940074565')
    await token1.transfer(pair.address, swapAmount)
    await expect(pair.swap(expectedOutputAmount, 0, wallet.address, '0x', overrides))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, expectedOutputAmount)
      .to.emit(pair, 'Sync')
      .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(swapAmount))
      .to.emit(pair, 'Swap')
      .withArgs(wallet.address, 0, swapAmount, expectedOutputAmount, 0, wallet.address)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount))
    expect(reserves[1]).to.eq(token1Amount.add(swapAmount))
    expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount))
    expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(swapAmount))
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).sub(swapAmount))
  })

  it('swap:gas', async () => {
    const token0Amount = expandTo18Decimals(5)
    const token1Amount = expandTo18Decimals(10)
    await addLiquidity(token0Amount, token1Amount)

    // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
    await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    await pair.sync(overrides)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = bigNumberify('453305446940074565')
    await token1.transfer(pair.address, swapAmount)
    await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    const tx = await pair.swap(expectedOutputAmount, 0, wallet.address, '0x', overrides)
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(74338)
  })

  it('burn', async () => {
    const token0Amount = expandTo18Decimals(3)
    const token1Amount = expandTo18Decimals(3)
    await addLiquidity(token0Amount, token1Amount)

    const expectedLiquidity = expandTo18Decimals(3)
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    await expect(pair.burn(wallet.address, overrides))
      .to.emit(pair, 'Transfer')
      .withArgs(pair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      .to.emit(token0, 'Transfer')
      .withArgs(pair.address, wallet.address, token0Amount.sub(1000))
      .to.emit(token1, 'Transfer')
      .withArgs(pair.address, wallet.address, token1Amount.sub(1000))
      .to.emit(pair, 'Sync')
      .withArgs(1000, 1000)
      .to.emit(pair, 'Burn')
      .withArgs(wallet.address, token0Amount.sub(1000), token1Amount.sub(1000), wallet.address)

    expect(await pair.balanceOf(wallet.address)).to.eq(0)
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
    expect(await token0.balanceOf(pair.address)).to.eq(1000)
    expect(await token1.balanceOf(pair.address)).to.eq(1000)
    const totalSupplyToken0 = await token0.totalSupply()
    const totalSupplyToken1 = await token1.totalSupply()
    expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(1000))
    expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(1000))
  })

  it('price{0,1}CumulativeLast', async () => {
    await pair.setFeeAmount(300)
    await factory.setOwnerFeeShare(16666)

    const token0Amount = expandTo18Decimals(3)
    const token1Amount = expandTo18Decimals(3)
    await addLiquidity(token0Amount, token1Amount)

    const blockTimestamp = (await pair.getReserves())[2]
    await mineBlock(provider, blockTimestamp + 1)
    await pair.sync(overrides)

    const initialPrice = encodePrice(token0Amount, token1Amount)
    expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0])
    expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1])
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 1)

    const swapAmount = expandTo18Decimals(3)
    await token0.transfer(pair.address, swapAmount)
    await mineBlock(provider, blockTimestamp + 10)
    // swap to a new price eagerly instead of syncing
    await pair.swap(0, expandTo18Decimals(1), wallet.address, '0x', overrides) // make the price nice

    expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(10))
    expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(10))
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 10)

    await mineBlock(provider, blockTimestamp + 20)
    await pair.sync(overrides)

    const newPrice = encodePrice(expandTo18Decimals(6), expandTo18Decimals(2))
    expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(10).add(newPrice[0].mul(10)))
    expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(10).add(newPrice[1].mul(10)))
    expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 20)
  })

  it('feeTo:off', async () => {
    await pair.setFeeAmount(300)
    await factory.setFeeTo(AddressZero)

    const token0Amount = expandTo18Decimals(1000)
    const token1Amount = expandTo18Decimals(1000)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = bigNumberify('996006981039903216')
    await token1.transfer(pair.address, swapAmount)
    await pair.swap(expectedOutputAmount, 0, wallet.address, '0x', overrides)

    const expectedLiquidity = expandTo18Decimals(1000)
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    await pair.burn(wallet.address, overrides)
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
  })

  it('feeTo:on', async () => {
    await pair.setFeeAmount(300)
    await factory.setOwnerFeeShare(16666)

    await factory.setFeeTo(other.address)

    const token0Amount = expandTo18Decimals(1000)
    const token1Amount = expandTo18Decimals(1000)
    await addLiquidity(token0Amount, token1Amount)

    const swapAmount = expandTo18Decimals(1)
    const expectedOutputAmount = bigNumberify('996006981039903216')
    await token1.transfer(pair.address, swapAmount)
    await pair.swap(expectedOutputAmount, 0, wallet.address, '0x', overrides)

    const expectedLiquidity = expandTo18Decimals(1000)
    await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    await pair.burn(wallet.address, overrides)
    expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY.add('249750499251388'))
    expect(await pair.balanceOf(other.address)).to.eq('249750499251388')

    // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
    // ...because the initial liquidity amounts were equal
    expect(await token0.balanceOf(pair.address)).to.eq(bigNumberify(1000).add('249501683697445'))
    expect(await token1.balanceOf(pair.address)).to.eq(bigNumberify(1000).add('250000187312969'))
  })
})