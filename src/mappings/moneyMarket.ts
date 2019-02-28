import {BigInt} from '@graphprotocol/graph-ts'
import {
  BorrowLiquidated,
  BorrowRepaid,
  BorrowTaken,
  MoneyMarket,
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

// Note - each time a tx happens, the interest earned resets.

export function handleSupplyReceived(event: SupplyReceived): void {
  let id = event.params.account.toHex()
  let user = new User(id)
  user.save()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  // Must load the asset, and create it if it doesn't exist yet
  let asset = Asset.load(assetUserID)
  if (asset == null) {
    asset = new Asset(assetUserID)
    asset.transactionHashes = []
    asset.transactionTimes = []
  }

  asset.user = event.params.account
  asset.supplyPrincipal = event.params.newBalance

  // For sure works, I checked. Note that the interest earned resets on every tx in the Dapp. This number is only up to date with the most recent transaction
  asset.supplyInterestLastChange = event.params.newBalance.minus(event.params.amount).minus(event.params.startingBalance)
  asset.totalSupplyInterest = asset.supplyInterestLastChange.plus(asset.totalSupplyInterest as BigInt)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  let txTimes = asset.transactionTimes
  txTimes.push(event.block.timestamp.toI32())
  asset.transactionTimes = txTimes

  // need to get the supplyInterestIndex, so we call the contract directly with MoneyMarket.bind()
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let supplyBalance = moneyMarketContract.supplyBalances(event.params.account, assetAddress)
  asset.supplyInterestIndex = supplyBalance.value1

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.perBlockSupplyInterest = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.perBlockBorrowInterest = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()
}


export function handleSupplyWithdrawn(event: SupplyWithdrawn): void {
  let id = event.params.account.toHex()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)

  asset.user = event.params.account
  asset.supplyPrincipal = event.params.newBalance

  // NOTE - updated formula here to newbalance + amount - startingBalance (stated wrong in contract file)
  // For sure works, I checked. Note that the interest earned resets on every tx in the Dapp. This number is only up to date with the most recent transaction
  asset.supplyInterestLastChange = event.params.newBalance.plus(event.params.amount).minus(event.params.startingBalance)
  asset.totalSupplyInterest = asset.supplyInterestLastChange.plus(asset.totalSupplyInterest as BigInt)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  let txTimes = asset.transactionTimes
  txTimes.push(event.block.timestamp.toI32())
  asset.transactionTimes = txTimes

  // need to get the supplyInterestIndex
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let supplyBalance = moneyMarketContract.supplyBalances(event.params.account, assetAddress)
  asset.supplyInterestIndex = supplyBalance.value1

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.perBlockSupplyInterest = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.perBlockBorrowInterest = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()
}

// Note - borrowFeeTaken adds to the total borrowed amount that needs to be repaid, but it doesnt actually add to what the user borrows. thats why doTransferOut() uses the normal borrowed amount. and that is why the interest calculated is newBalance - borrowAmountWithFee - startingBalance
export function handleBorrowTaken(event: BorrowTaken): void {
  let id = event.params.account.toHex()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)
  if (asset == null) {
    asset = new Asset(assetUserID)
    asset.transactionHashes = []
    asset.transactionTimes = []
  }
  asset.user = event.params.account
  asset.borrowPrincipal = event.params.newBalance
  asset.borrowInterestLastChange = event.params.newBalance.minus(event.params.borrowAmountWithFee).minus(event.params.startingBalance)
  asset.totalBorrowInterest = asset.borrowInterestLastChange.plus(asset.totalBorrowInterest as BigInt)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  let txTimes = asset.transactionTimes
  txTimes.push(event.block.timestamp.toI32())
  asset.transactionTimes = txTimes

  // need to get the borrowInterestIndex
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let borrowBalance = moneyMarketContract.borrowBalances(event.params.account, assetAddress)
  asset.borrowInterestIndex = borrowBalance.value1

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.perBlockSupplyInterest = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.perBlockBorrowInterest = updatedMarket.value7
  market.borrowIndex = updatedMarket.value8

  market.save()
}

export function handleBorrowRepaid(event: BorrowRepaid): void {
  let id = event.params.account.toHex()

  let assetAddress = event.params.asset
  let market = Market.load(assetAddress.toHex())
  let assetName = market.assetName
  let assetUserID = assetName.concat("-".concat(id))

  let asset = Asset.load(assetUserID)

  asset.user = event.params.account
  asset.borrowPrincipal = event.params.newBalance

  // NOTE - updated formula here to newbalance + amount - startingBalance (stated wrong in contract file)
  asset.borrowInterestLastChange = event.params.newBalance.plus(event.params.amount).minus(event.params.startingBalance)
  asset.totalBorrowInterest = asset.borrowInterestLastChange.plus(asset.totalBorrowInterest as BigInt)

  let txHashes = asset.transactionHashes
  txHashes.push(event.transaction.hash)
  asset.transactionHashes = txHashes

  let txTimes = asset.transactionTimes
  txTimes.push(event.block.timestamp.toI32())
  asset.transactionTimes = txTimes

  // need to get the borrowInterestIndex
  let moneyMarketContract = MoneyMarket.bind(event.address)
  let borrowBalance = moneyMarketContract.borrowBalances(event.params.account, assetAddress)
  asset.borrowInterestIndex = borrowBalance.value1

  asset.save()

  // Call into the contract getter and update market
  let marketContract = MoneyMarket.bind(event.address)
  let updatedMarket = marketContract.markets(assetAddress)
  market.blockNumber = event.block.number
  market.totalSupply = updatedMarket.value3
  market.perBlockSupplyInterest = updatedMarket.value4
  market.supplyIndex = updatedMarket.value5
  market.totalBorrows = updatedMarket.value6
  market.perBlockBorrowInterest = updatedMarket.value7
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
  let borrowAssetTarget = new Asset(borrowAssetTargetAccountID)
  let updatedBorrowTargetBalance = moneyMarketContract.borrowBalances(event.params.targetAccount, event.params.assetBorrow)
  let updatedBorrowAssetTargetPrincipal = updatedBorrowTargetBalance.value0
  let updatedBorrowAssetTargetInterestIndex = updatedBorrowTargetBalance.value1
  borrowAssetTarget.borrowPrincipal = updatedBorrowAssetTargetPrincipal
  borrowAssetTarget.borrowInterestIndex = updatedBorrowAssetTargetInterestIndex

  borrowAssetTarget.save()

  let collateralAssetName = collateralMarket.assetName
  let collateralAssetTargetAccountID = collateralAssetName.concat("-".concat(event.params.targetAccount.toHex()))

  // access contract storage - supplyBalances[targetAccount][event.params.assetCollateral]
  let collateralAssetTarget = new Asset(collateralAssetTargetAccountID)
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
    collateralAssetLiquidator.transactionTimes = []
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
  borrowMarket.perBlockSupplyInterest = updatedBorrowMarket.value4
  borrowMarket.supplyIndex = updatedBorrowMarket.value5
  borrowMarket.perBlockBorrowInterest = updatedBorrowMarket.value7
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
  market.perBlockSupplyInterest = BigInt.fromI32(0)
  market.supplyIndex = BigInt.fromI32(0)
  market.totalBorrows = BigInt.fromI32(0)
  market.perBlockBorrowInterest = BigInt.fromI32(0)
  market.borrowIndex = BigInt.fromI32(0)
  market.priceInWei = BigInt.fromI32(0)

  // First check if it is the mainnet address
  if (event.address.toHex() == "0x3fda67f7583380e67ef93072294a7fac882fd7e7") {
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
      market.assetName = "Unknown".concat('-').concat(event.address.toHex()) // concatenation of unknown and address, so they don't overwrite each other
    }
    // Else it is Rinkeby, and must match the rinkeby addresses
  } else {
    if (id == "0x4e17c87c52d0e9a0cad3fbc53b77d9514f003807") {
      market.assetName = "DAI"
    } else if (id == "0x930b647320f738d92f5647b2e5c4458497ce3c95") {
      market.assetName = "REP"
    } else if (id == "0xbf7bbeef6c56e53f79de37ee9ef5b111335bd2ab") {
      market.assetName = "BAT"
    } else if (id == "0xc778417e063141139fce010982780140aa0cd5ab") {
      market.assetName = "WETH"
    } else if (id == "0x8de2f821bc97979b7171e7a6fe065b9e17f73b87") {
      market.assetName = "ZRX"
    } else if (id == "0x55080ac40700bde5725d8a87f48a01e192f660af") {
      market.assetName = "KNC" // Note, rinkeby has KyberNetworkCrystal, but it doesn't show up in the Dapp UI
    } else {
      market.assetName = "Unknown".concat('-').concat(event.address.toHex())
    }
  }
  market.save()


  // On Rinkeby, this needs to be created, since handleNewOriginationFee and handleNewRiskParameters are never called
  // Conceivable on future launched markets too
  let moneyMarket = new MoneyMarketEntity("1")
  let moneyMarketContract = MoneyMarket.bind(event.address)
  moneyMarket.originationFee = moneyMarketContract.originationFee()
  moneyMarket.collateralRatio = moneyMarketContract.collateralRatio()
  moneyMarket.liquidationDiscount = moneyMarketContract.liquidationDiscount()
  moneyMarket.blocksPerYear = 2102400
  moneyMarket.save()


}

export function handleSuspendedMarket(event: SuspendedMarket): void {
  let id = event.params.asset.toHex()
  let market = new Market(id)
  market.isSuspended = true
  market.save()
}

export function handleNewRiskParameters(event: NewRiskParameters): void {
  let id = "1" // we only have one MoneyMarket, so just use id "1"
  let moneyMarket = new MoneyMarketEntity(id)
  moneyMarket.originationFee = BigInt.fromI32(0)
  moneyMarket.blocksPerYear = 2102400
  moneyMarket.collateralRatio = event.params.newCollateralRatioMantissa
  moneyMarket.liquidationDiscount = event.params.newLiquidationDiscountMantissa
  moneyMarket.save()
}

export function handleNewOriginationFee(event: NewOriginationFee): void {
  let id = "1"
  let moneyMarket = new MoneyMarketEntity(id)
  moneyMarket.collateralRatio = BigInt.fromI32(0)
  moneyMarket.liquidationDiscount = BigInt.fromI32(0)
  moneyMarket.blocksPerYear = 2102400
  moneyMarket.originationFee = event.params.newOriginationFeeMantissa
  moneyMarket.save()
}

export function handleSetMarketInterestRateModel(event: SetMarketInterestRateModel): void {
  let id = event.params.asset.toHex()
  let market = new Market(id)
  market.interestRateModel = event.params.interestRateModel
  market.save()
}