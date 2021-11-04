const ExcaliburFactory = artifacts.require("ExcaliburV2Factory");
const WETH = artifacts.require("WETH");
const USD = artifacts.require("ERC20");

module.exports = async function (deployer, network, accounts) {

  let ethTokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  let usdTokenAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
  let excTokenAddress = process.env.EXC_ADDRESS.toString().trim();
  let feeManager = process.env.FEE_MANAGER_ADDRESS.toString().trim();


  if (network === 'testnet' || network === 'development') {
    console.warn('WARNING: Using account[1] for testnet');

    if (network === 'development') {
      await deployer.deploy(WETH);
      await deployer.deploy(USD, '10000000000000000000000')
      ethTokenAddress = (await WETH.deployed()).address;
      usdTokenAddress = (await USD.deployed()).address;
    } else {
      ethTokenAddress = "0xae13d989dac2f0debff460ac112a837c89baa7cd";
      usdTokenAddress = "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee";
    }
    excTokenAddress = process.env.EXC_ADDRESS_TESTNET.toString().trim();
    feeManager = process.env.FEE_MANAGER_ADDRESS_TESTNET.toString().trim();
  }

  let factory = await deployer.deploy(ExcaliburFactory, feeManager)
  await factory.createPair(excTokenAddress, usdTokenAddress)
  await factory.createPair(excTokenAddress, ethTokenAddress)
  await factory.createPair(usdTokenAddress, ethTokenAddress)
  console.table({
      'exc_usd':await factory.getPair(excTokenAddress, usdTokenAddress),
      'exc_eth':await factory.getPair(excTokenAddress, ethTokenAddress),
      'eth_usd': await factory.getPair(ethTokenAddress, usdTokenAddress)
  })
};
