const hre = require("hardhat");
require('dotenv').config();

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const feeManagerAddress = process.env.FEE_MANAGER_ADDRESS.toString().trim();

  // Deploy GrailToken
  await deploy('CamelotFactory', {
    from: deployer,
    args: [feeManagerAddress],
    log: true,
  });
};
module.exports.tags = ['CamelotFactory'];