const CamelotFactory = artifacts.require("CamelotFactory");

module.exports = async function (deployer, network, accounts) {
  let feeManager = process.env.FEE_MANAGER_ADDRESS.toString().trim();
  await deployer.deploy(CamelotFactory, feeManager)
};
