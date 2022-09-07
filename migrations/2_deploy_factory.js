const ExcaliburFactory = artifacts.require("ExcaliburV2Factory");

module.exports = async function (deployer, network, accounts) {
  let feeManager = process.env.FEE_MANAGER_ADDRESS.toString().trim();

  let factory = await deployer.deploy(ExcaliburFactory, feeManager)
};
