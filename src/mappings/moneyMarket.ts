import {BigInt, ByteArray} from '@graphprotocol/graph-ts'
import {
  BorrowLiquidated,
  BorrowRepaid,
  BorrowTaken,
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

  asset.save()

  // TODO call into the contract getter and update market

}

// TODO - do similar for the next three, what I did above
export function handleSupplyWithdrawn(event: SupplyWithdrawn): void {

}

export function handleBorrowTaken(event: BorrowTaken): void {

}

export function handleBorrowRepaid(event: BorrowRepaid): void {

}

export function handleBorrowLiquidated(event: BorrowLiquidated): void {

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