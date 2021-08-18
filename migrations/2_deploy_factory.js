const ExcaliburFactory = artifacts.require("ExcaliburV2Factory");
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS

module.exports = function (deployer, network, accounts) {
  //
  // let bnbTokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  // let busdTokenAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
  // let excTokenAddress = process.env.TOKEN_ADDRESS.toString().trim();
  // let feeManager = process.env.FEE_MANAGER_ADDRESS.toString().trim();
  //
  // if (network === 'testnet' || network === 'development') {
  //   console.warn('WARNING: Using account[1] for testnet');
  //   bnbTokenAddress = "0xae13d989dac2f0debff460ac112a837c89baa7cd";
  //   busdTokenAddress = "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee";
  //   excTokenAddress = process.env.TOKEN_ADDRESS_TESTNET.toString().trim();
  //   feeManager = process.env.FEE_MANAGER_ADDRESS_TESTNET.toString().trim();
  // }
  //
  // let excaliburFactory;
  // let exc_bnb_lp;
  // let exc_busd_lp;
  // let bnb_busd_lp;
  //
  // deployer.deploy(ExcaliburFactory, feeManager).then((instance) => {
  //   excaliburFactory = instance;
  //   exc_busd_lp = excaliburFactory.createPair(excTokenAddress,busdTokenAddress);
  // }).then((tx) => {
  //   excaliburFactory.createPair(excTokenAddress,bnbTokenAddress).then( (exc_bnb_lp_) =>{
  //     exc_bnb_lp = exc_bnb_lp_;
  //   });
  // }).then((tx) => {
  //   excaliburFactory.createPair(busdTokenAddress,bnbTokenAddress).then( (bnb_busd_lp_) =>{
  //     bnb_busd_lp = bnb_busd_lp_;
  //   });
  // }).then(() => {
  //   console.table({
  //       ExcaliburFactory:ExcaliburFactory.address,
  //       EXC_BNB:exc_bnb_lp,
  //       EXC_BUSD:exc_busd_lp,
  //       BNB_BUSD:bnb_busd_lp,
  //   })
  // });
};
