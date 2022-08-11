import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import {solidity, MockProvider, createFixtureLoader, deployContract} from 'ethereum-waffle'

import {expandTo18Decimals, getCreate2Address} from './shared/utilities'
import { factoryFixture } from './shared/fixtures'

import ExcaliburV2Pair from '../build/contracts/ExcaliburV2Pair.json'
import ERC20 from "../build/contracts/ERC20.json";

chai.use(solidity)

let TEST_ADDRESSES: [string, string];

describe('ExcaliburV2Factory', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [wallet, other])

  let factory: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(factoryFixture)
    factory = fixture.factory
    TEST_ADDRESSES = [fixture.tokenB.address, fixture.tokenA.address]
  })

  it('feeTo, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(other.address)
    expect(await factory.owner()).to.eq(wallet.address)
    expect(await factory.allPairsLength()).to.eq(0)
  })

  async function createPair(tokens: [string, string]) {
    await factory.createPair(...tokens)
    const create2Address = await factory.getPair(...tokens) // getCreate2Address(factory.address, tokens, `${ExcaliburPair.bytecode}`)

    // console.log(await factory.allPairsLength())
    // console.log(await factory.getPair(...tokens))
    // console.log(await factory.allPairs(0))
    // console.log("TEST2")
    // console.log("TEST")

    // const [token0, token1] = tokens[0] < tokens[1] ? [tokens[0], tokens[1]] : [tokens[1], tokens[0]]
    // await expect(factory.createPair(...tokens))
    //     .to.emit(factory, 'PairCreated').withArgs(token0, token1, create2Address, bigNumberify(1))

    await expect(factory.createPair(...tokens)).to.be.reverted // UniswapV2: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // UniswapV2: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await factory.allPairs(0)).to.eq(create2Address)
    expect(await factory.allPairsLength()).to.eq(1)

    const pair = new Contract(create2Address, JSON.stringify(ExcaliburV2Pair.abi), provider)
    expect(await pair.factory()).to.eq(factory.address)
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES)
  })

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
  })

  it('createPair:gas', async () => {
    const tx = await factory.createPair(...TEST_ADDRESSES)
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(3653414)
  })

  it('setFeeTo', async () => {
    await expect(factory.connect(other).setFeeTo(other.address)).to.be.revertedWith(
      'ExcaliburV2Factory: caller is not the owner'
    )
    await factory.setFeeTo(wallet.address)
    expect(await factory.feeTo()).to.eq(wallet.address)
  })
})
