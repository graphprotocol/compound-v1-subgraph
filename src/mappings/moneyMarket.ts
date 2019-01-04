import {BigInt} from '@graphprotocol/graph-ts'
import {
  BorrowLiquidated,
  BorrowRepaid,
  BorrowTaken, MoneyMarket,
  NewOriginationFee,
  NewRiskParameters,
  SetMarketInterestRateModel,
  SupplyReceived,
  SupplyWithdrawn,
  SupportedMarket,
  SuspendedMarket
} from '../types/MoneyMarket/MoneyMarket'

import {
  Market,
  MoneyMarket as MoneyMarketEntity,
  User,
  Asset
} from '../types/schema'


export function handleSupplyReceived(event: SupplyReceived): void {
  let id = event.params.account.toHex()
  let user = User.load(id)
  if (user == null){
    user = new User(id)
  }

  user.save()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)
  if (asset == null){
    asset = new Asset(assetUserID)
    asset.transactionHashes = []
  }
  asset.user = event.params.account
  asset.supplyPrincipal = event.params.newBalance
  asset.supplyInterest = event.params.newBalance.minus(event.params.amount).minus(event.params.startingBalance)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  // need to get the supplyIndexInterest
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let supplyBalance = moneyMarketContract.supplyBalances(event.params.account, assetAddress)
  let supplyIndexInterest = supplyBalance.value1
  asset.supplyInterestIndex = supplyIndexInterest

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.supplyRateMantissa = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.borrowRateMantissa = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()
}


export function handleSupplyWithdrawn(event: SupplyWithdrawn): void {
  let id = event.params.account.toHex()

  // not needed, because user exists if they are withdrawing
  // let user = User.load(id)
  // if (user == null){
  //   user = new User(id)
  // }
  //
  // user.save()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)


  // Unexpectedly this is needed. Assumption is that a user liquidates another user, and then withdraws the clamined collateral, and in this case the asset was never created in the deposit case
  // TODO - double check this is needed. i.e. comment it out and test it again
  if (asset == null){
    asset = new Asset(assetUserID)
    asset.transactionHashes = []
  }
  asset.user = event.params.account
  asset.supplyPrincipal = event.params.newBalance

  // NOTE - updated formula here to newbalance + amount - startingBalance (stated wrong in contract file)
  asset.supplyInterest = event.params.newBalance.plus(event.params.amount).minus(event.params.startingBalance)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  // need to get the supplyIndexInterest
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let supplyBalance = moneyMarketContract.supplyBalances(event.params.account, assetAddress)
  let supplyIndexInterest = supplyBalance.value1
  asset.supplyInterestIndex = supplyIndexInterest

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.supplyRateMantissa = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.borrowRateMantissa = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()
}

// Note - borrowFeeTaken adds to the total borrowed amount that needs to be repaid, but it doesnt actually add to what the user borrows. thats why doTransferOut() uses the normal borrowed amount. and that is why the interest calculated is newBalance - borrowAmountWithFee - startingBalance
export function handleBorrowTaken(event: BorrowTaken): void {
  let id = event.params.account.toHex()

  // not needed, because user exists if they are borrowing, since they need supplying as collateral
  // let user = User.load(id)
  // if (user == null){
  //   user = new User(id)
  // }
  //
  // user.save()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)
  if (asset == null){
    asset = new Asset(assetUserID)
    asset.transactionHashes = []
  }
  asset.user = event.params.account
  asset.borrowPrincipal = event.params.newBalance
  asset.borrowInterest = event.params.newBalance.minus(event.params.borrowAmountWithFee).minus(event.params.startingBalance)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  // need to get the borrowIndexInterest
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let borrowBalance = moneyMarketContract.borrowBalances(event.params.account, assetAddress)
  let borrowIndexInterest = borrowBalance.value1
  asset.supplyInterestIndex = borrowIndexInterest

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.supplyRateMantissa = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.borrowRateMantissa = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()
}

export function handleBorrowRepaid(event: BorrowRepaid): void {
  let id = event.params.account.toHex()

  // not needed, because user exists if they are borrowing, since they need supplying as collateral
  // let user = User.load(id)
  // if (user == null){
  //   user = new User(id)
  // }
  //
  // user.save()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)

  // not needed, already exists if repaid
  // if (asset == null){
  //   asset = new Asset(assetUserID)
  //   asset.transactionHashes = []
  // }
  asset.user = event.params.account
  asset.borrowPrincipal = event.params.newBalance

  // NOTE - updated formula here to newbalance + amount - startingBalance (stated wrong in contract file)
  asset.borrowInterest = event.params.newBalance.plus(event.params.amount).minus(event.params.startingBalance)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  // need to get the borrowIndexInterest
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let borrowBalance = moneyMarketContract.borrowBalances(event.params.account, assetAddress)
  let borrowIndexInterest = borrowBalance.value1
  asset.supplyInterestIndex = borrowIndexInterest

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.supplyRateMantissa = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.borrowRateMantissa = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()

}

// Updates the borrowing market and the collateral market
export function handleBorrowLiquidated(event: BorrowLiquidated): void {

  let borrowMarketID = event.params.assetBorrow.toHex()
  let collateralMarketID = event.params.assetCollateral.toHex()
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let borrowMarket = Market.load(borrowMarketID)
  let collateralMarket = Market.load(collateralMarketID)

  ///// UPDATING USER ASSETS BELOW /////

  let borrowAssetName = borrowMarket.assetName
  let borrowAssetTargetAccountID = borrowAssetName.concat("-".concat(event.params.targetAccount.toHex()))

  // access contract storage - borrowBalances[targetAccount][event.params.assetBorrow]
  let borrowAssetTarget = Asset.load(borrowAssetTargetAccountID)
  let updatedBorrowTargetBalance = moneyMarketContract.borrowBalances(event.params.targetAccount, event.params.assetBorrow)
  let updatedBorrowAssetTargetPrincipal = updatedBorrowTargetBalance.value0
  let updatedBorrowAssetTargetInterestIndex = updatedBorrowTargetBalance.value1
  borrowAssetTarget.borrowPrincipal = updatedBorrowAssetTargetPrincipal
  borrowAssetTarget.borrowInterestIndex = updatedBorrowAssetTargetInterestIndex

  borrowAssetTarget.save()

  let collateralAssetName = collateralMarket.assetName
  let collateralAssetTargetAccountID = collateralAssetName.concat("-".concat(event.params.targetAccount.toHex()))

  // access contract storage - supplyBalances[targetAccount][event.params.assetCollateral]
  let collateralAssetTarget = Asset.load(collateralAssetTargetAccountID)
  let updatedCollateralSupplyTargetBalance = moneyMarketContract.supplyBalances(event.params.targetAccount, event.params.assetCollateral)
  let updatedCollateralSupplyTargetPrincipal = updatedCollateralSupplyTargetBalance.value0
  let updatedCollateralSupplyTargetInterestIndex = updatedCollateralSupplyTargetBalance.value1
  collateralAssetTarget.supplyPrincipal = updatedCollateralSupplyTargetPrincipal
  collateralAssetTarget.supplyInterestIndex = updatedCollateralSupplyTargetInterestIndex

  collateralAssetTarget.save()

  let collateralAssetLiquidatorAccountID = collateralAssetName.concat("-".concat(event.params.liquidator.toHex()))

  // access contract storage - supplyBalances[event.params.liquidator][event.params.assetCollateral]
  let collateralAssetLiquidator = Asset.load(collateralAssetLiquidatorAccountID)

  // need to consider, because it is possible the liquidator never interacted with the asset before in the money market
  if (collateralAssetLiquidator == null) {
    collateralAssetLiquidator = new Asset(collateralAssetLiquidatorAccountID)
    collateralAssetLiquidator.transactionHashes = []
  }
  let updatedCollateralSupplyLiquidatorBalance = moneyMarketContract.supplyBalances(event.params.liquidator, event.params.assetCollateral)
  let updatedCollateralSupplyLiquidatorPrincipal = updatedCollateralSupplyLiquidatorBalance.value0
  let updatedCollateralSupplyLiquidatorInterestIndex = updatedCollateralSupplyLiquidatorBalance.value1
  collateralAssetLiquidator.supplyPrincipal = updatedCollateralSupplyLiquidatorPrincipal
  collateralAssetLiquidator.supplyInterestIndex = updatedCollateralSupplyLiquidatorInterestIndex

  collateralAssetLiquidator.save()

  ///// UPDATING MARKETS BELOW /////

  let updatedBorrowMarket = moneyMarketContract.markets(event.params.assetBorrow)
  borrowMarket.blockNumber = event.block.number
  borrowMarket.totalBorrows = updatedBorrowMarket.value6
  borrowMarket.supplyRateMantissa = updatedBorrowMarket.value4
  borrowMarket.supplyIndex = updatedBorrowMarket.value5
  borrowMarket.borrowRateMantissa = updatedBorrowMarket.value7
  borrowMarket.borrowIndex = updatedBorrowMarket.value8
  // note, borrowMarket total supply not updated by this event! see the contract

  borrowMarket.save()


  let updatedCollateralMarket = moneyMarketContract.markets(event.params.assetCollateral)
  collateralMarket.blockNumber = event.block.number
  collateralMarket.totalSupply = updatedCollateralMarket.value3
  collateralMarket.supplyIndex = updatedCollateralMarket.value5
  collateralMarket.borrowIndex = updatedCollateralMarket.value8
  // note, other collateral market values not updated by this event! see the contract

  collateralMarket.save()

}

export function handleSupportedMarket(event: SupportedMarket): void {
  let id = event.params.asset.toHex()
  let market = new Market(id)

  market.interestRateModel = event.params.interestRateModel
  market.isSupported = true
  market.isSuspended = false
  market.blockNumber = event.block.number
  market.totalSupply = BigInt.fromI32(0)
  market.supplyRateMantissa = BigInt.fromI32(0)
  market.supplyIndex = BigInt.fromI32(0)
  market.totalBorrows = BigInt.fromI32(0)
  market.borrowRateMantissa = BigInt.fromI32(0)
  market.borrowIndex = BigInt.fromI32(0)

  if (id == "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359") {
    market.assetName = "DAI"
  } else if (id == "0x1985365e9f78359a9b6ad760e32412f4a445e862") {
    market.assetName = "REP"
  } else if (id == "0x0d8775f648430679a709e98d2b0cb6250d2887ef") {
    market.assetName = "BAT"
  } else if (id == "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2") {
    market.assetName = "WETH"
  } else if (id == "0xe41d2489571d322189246dafa5ebde1f4699f498") {
    market.assetName = "ZRX"
  } else {
    market.assetName = "Unknown"
  }
  market.save()
}

export function handleSuspendedMarket(event: SuspendedMarket): void {
  let id = event.params.asset.toHex()
  let market = Market.load(id)

  market.isSuspended = true

  market.save()
}

export function handleNewRiskParameters(event: NewRiskParameters): void {
  let id = "1"
  let moneyMarket = MoneyMarketEntity.load(id)
  if (moneyMarket == null) {
    moneyMarket = new MoneyMarketEntity(id)
    moneyMarket.originationFeeMantissa = BigInt.fromI32(0)
  }

  moneyMarket.collateralRatioMantissa = event.params.newCollateralRatioMantissa
  moneyMarket.liquidationDiscountMantissa = event.params.newLiquidationDiscountMantissa

  moneyMarket.save()
}

export function handleNewOriginationFee(event: NewOriginationFee): void {
  let id = "1"
  let moneyMarket = MoneyMarketEntity.load(id)
  if (moneyMarket == null) {
    moneyMarket = new MoneyMarketEntity(id)
    moneyMarket.collateralRatioMantissa = BigInt.fromI32(0)
    moneyMarket.liquidationDiscountMantissa = BigInt.fromI32(0)
  }

  moneyMarket.originationFeeMantissa = event.params.newOriginationFeeMantissa

  moneyMarket.save()
}

export function handleSetMarketInterestRateModel(event: SetMarketInterestRateModel): void {
  let id = event.params.asset.toHex()
  let market = Market.load(id)

  market.interestRateModel = event.params.interestRateModel

  market.save()
}