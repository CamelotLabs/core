import { Contract, Wallet } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from './utilities'

import ERC20 from '../../build/contracts/ERC20.json'
import UniswapV2Factory from '../../build/contracts/ExcaliburV2Factory.json'
import UniswapV2Pair from '../../build/contracts/ExcaliburV2Pair.json'

interface FactoryFixture {
  factory: Contract
  tokenA: Contract
  tokenB: Contract
}

const overrides = {
  gasLimit: 9999999
}

export async function factoryFixture(_: Web3Provider, [wallet, other]: Wallet[]): Promise<FactoryFixture> {
  const factory = await deployContract(wallet, UniswapV2Factory, [other.address], overrides)

  const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)

  return { factory, tokenA, tokenB }
}

interface PairFixture extends FactoryFixture {
  token0: Contract
  token1: Contract
  pair: Contract
}

export async function pairFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<PairFixture> {
  const { factory, tokenA, tokenB } = await factoryFixture(provider, [wallet, wallet])

  await factory.createPair(tokenA.address, tokenB.address, overrides)
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
  const pair = new Contract(pairAddress, JSON.stringify(UniswapV2Pair.abi), provider).connect(wallet)

  const token0Address = (await pair.token0()).address
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  return { factory, tokenA, tokenB, token0, token1, pair }
}
