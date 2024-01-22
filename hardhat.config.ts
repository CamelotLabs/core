import "@nomicfoundation/hardhat-toolbox"
import "@nomiclabs/hardhat-truffle5"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-abi-exporter"
import 'hardhat-deploy'
import dotenv from 'dotenv'

dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      skipDryRun: true,
      accounts: [process.env.DEPLOYER_PKEY.toString().trim()],
    },
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      skipDryRun: true,
      accounts: [process.env.DEPLOYER_PKEY.toString().trim()],
    }
  },
  solidity: {
    compilers: [
    {
      version: "0.5.16",
      settings: {
        optimizer: {
          enabled: true,
          runs: 0
        }
      }
    }, {
      version: "0.6.6",
      settings: {
        optimizer: {
          enabled: true,
          runs: 0
        },
      }
    }]
  },
  namedAccounts: {
    deployer: {
      default: 0,
      "arbitrumSepolia": process.env.DEPLOYER_ADDRESS.toString().trim(),
      "arbitrumOne": process.env.DEPLOYER_ADDRESS.toString().trim()
    }
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY.toString().trim(),
      arbitrumSepolia: process.env.ARBISCAN_API_KEY.toString().trim()
    },
    customChains: [{
      network: "arbitrumSepolia",
      chainId: 421614,
      urls: {
        apiURL: "https://api-sepolia.arbiscan.io/api",
        browserURL: "https://sepolia.arbiscan.io"
      }
    }]
  },
  abiExporter: {
    clear: true
  },

};
