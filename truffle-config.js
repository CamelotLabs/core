/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config()
require('ts-node/register')

const MNENOMIC = process.env.MNEMONIC.toString().trim();

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */
  test_file_extension_regexp: /.*\.ts$/,

  networks: {
    development: {
      host: 'localhost', // Localhost (default: none)
      port: 8545, // Standard port (default: none)
      network_id: '*', // Any network (default: none)
    },
    arbitrum_testnet: {
      provider: () => new HDWalletProvider(MNENOMIC, `https://goerli-rollup.arbitrum.io/rpc`),
      network_id: 421613,
      confirmations: 1,
      timeoutBlocks: 1200,
      skipDryRun: true,
      from: process.env.DEPLOYER_ADDRESS_TESTNET.toString().trim(),
    },
  },

  mocha: {
    extension: ["ts"],
    spec: "./test/**/*.spec.ts",
    require: "ts-node/register",
    timeout: 12000,
    reporter: "eth-gas-reporter",
    reporterOption: [
      "url=http://127.0.0.1:8545"
    ]
  },

  plugins: [
    'truffle-plugin-verify'
  ],

  api_keys: {
    etherscan: process.env.API_KEY.toString().trim(),
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.16",    // Fetch exact version from solc-bin (default: truffle's version)
       settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 30000
        }
      }
    }
  }
};
