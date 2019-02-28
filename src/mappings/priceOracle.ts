import {BigInt, Address, Value} from '@graphprotocol/graph-ts'
import {
  PricePosted,
  PriceOracle,
  CappedPricePosted
} from '../types/PriceOracle/PriceOracle'

import {
  Market,
} from '../types/schema'

// NOTE - In here, to do Int math, we purposely divide all values by 10^-14, so we can get USD prices. This is only
// safe because we know that all current compound markets are between $0.10 - $~100's (WETH PRICE). If we get really
// small coins worth fractions of a penny, it would round down to 0 and not work. However, we should have more
// functionality in our BigInt math soon, so we should be able to get rid of this in future iterations of Compound
// Subgraphs
let tenPowerFourteen = BigInt.fromI32(10000000).times(BigInt.fromI32(10000000))

// NOTE - The events must always trigger a lookup of DAI price, for two reasons.
// 1. To find the USD value of any other asset
// 2. There is no PricePosted or CappedPricePosted event for DAI, since it
// appears they are reading the DSValue DAI contract directly from a contract
// that maker created over a year ago (so it seems)

export function handlePricePosted(event: PricePosted): void {
  let daiID = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"
  let dai = Market.load(daiID)

  // TODO - delete this its temp for testing
  // if (dai == null){
  //   dai = new Market(daiID)
  //   dai.interestRateModel = Address.fromString("0x0000000000000000000000000000000000000000")
  //   dai.isSupported = true
  //   dai.isSuspended = false
  //   dai.blockNumber = event.block.number
  //   dai.totalSupply = BigInt.fromI32(0)
  //   dai.supplyRateMantissa = BigInt.fromI32(0)
  //   dai.supplyIndex = BigInt.fromI32(0)
  //   dai.totalBorrows = BigInt.fromI32(0)
  //   dai.borrowRateMantissa = BigInt.fromI32(0)
  //   dai.borrowIndex = BigInt.fromI32(0)
  // }

  let oracleContract = PriceOracle.bind(event.address)
  dai.priceInWei = oracleContract.getPrice(Address.fromString(daiID))
  dai.save()

  let id = event.params.asset.toHex()
  let market = Market.load(id)

  // TODO - delete this its temp for testing
  // if (market == null){
  //   market = new Market(id)
  //   market.interestRateModel = Address.fromString("0x0000000000000000000000000000000000000000")
  //   market.isSupported = true
  //   market.isSuspended = false
  //   market.blockNumber = event.block.number
  //   market.totalSupply = BigInt.fromI32(0)
  //   market.supplyRateMantissa = BigInt.fromI32(0)
  //   market.supplyIndex = BigInt.fromI32(0)
  //   market.totalBorrows = BigInt.fromI32(0)
  //   market.borrowRateMantissa = BigInt.fromI32(0)
  //   market.borrowIndex = BigInt.fromI32(0)
  // }

  if (id == "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"){
    market.priceInWei = BigInt.fromI32(100000).times(BigInt.fromI32(100000).times(BigInt.fromI32(100000)))
  } else {
    market.priceInWei = event.params.previousPriceMantissa
  }
  market.save()
}


export function handleCappedPricePosted(event: CappedPricePosted): void {
  let daiID = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"
  let dai = Market.load(daiID)

  // TODO - delete this its temp for testing
  // if (dai == null){
  //   dai = new Market(daiID)
  //   dai.interestRateModel = Address.fromString("0x0000000000000000000000000000000000000000")
  //   dai.isSupported = true
  //   dai.isSuspended = false
  //   dai.blockNumber = event.block.number
  //   dai.totalSupply = BigInt.fromI32(0)
  //   dai.supplyRateMantissa = BigInt.fromI32(0)
  //   dai.supplyIndex = BigInt.fromI32(0)
  //   dai.totalBorrows = BigInt.fromI32(0)
  //   dai.borrowRateMantissa = BigInt.fromI32(0)
  //   dai.borrowIndex = BigInt.fromI32(0)
  // }

  let oracleContract = PriceOracle.bind(event.address)
  dai.priceInWei = oracleContract.getPrice(Address.fromString(daiID))
  dai.save()

  let id = event.params.asset.toHex()
  let market = Market.load(id)

  // TODO - delete this its temp for testing
  // if (market == null){
  //   market = new Market(id)
  //   market.interestRateModel = Address.fromString("0x0000000000000000000000000000000000000000")
  //   market.isSupported = true
  //   market.isSuspended = false
  //   market.blockNumber = event.block.number
  //   market.totalSupply = BigInt.fromI32(0)
  //   market.supplyRateMantissa = BigInt.fromI32(0)
  //   market.supplyIndex = BigInt.fromI32(0)
  //   market.totalBorrows = BigInt.fromI32(0)
  //   market.borrowRateMantissa = BigInt.fromI32(0)
  //   market.borrowIndex = BigInt.fromI32(0)
  // }

  if (id == "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"){
    market.priceInWei = BigInt.fromI32(100000).times(BigInt.fromI32(100000).times(BigInt.fromI32(100000)))
  } else {
    market.priceInWei = event.params.cappedPriceMantissa
  }
  market.save()


}