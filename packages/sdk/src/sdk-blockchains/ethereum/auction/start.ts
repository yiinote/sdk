import type { RaribleSdk } from "@rarible/protocol-ethereum-sdk"
import type { Maybe } from "@rarible/types/build/maybe"
import type { EthereumWallet } from "@rarible/sdk-wallet"
import type { EthereumNetwork } from "@rarible/protocol-ethereum-sdk/build/types"
import { toBigNumber } from "@rarible/types"
import { toAuctionId } from "@rarible/types/build/auction-id"
import BigNumber from "bignumber.js"
import { OriginFeeSupport, PayoutsSupport } from "../../../types/order/fill/domain"
import * as common from "../common"
import type { EVMBlockchain } from "../common"
import {
	convertEthereumToAuctionId,
	getEthereumItemId,
	getEthTakeAssetType, getEVMBlockchain,
	isEVMBlockchain,
	toEthereumParts,
} from "../common"
import type { PrepareOrderInternalRequest } from "../../../types/order/common"
import type { IStartAuctionRequest, PrepareStartAuctionResponse } from "../../../types/auction/start"

export class EthereumAuctionStart {
	private readonly blockchain: EVMBlockchain

	constructor(
		private sdk: RaribleSdk,
		private wallet: Maybe<EthereumWallet>,
		private network: EthereumNetwork,
	) {
		this.blockchain = getEVMBlockchain(network)
		this.start = this.start.bind(this)
	}

	async start(prepareRequest: PrepareOrderInternalRequest): Promise<PrepareStartAuctionResponse> {
		const [domain, contract] = prepareRequest.collectionId.split(":")
		if (!isEVMBlockchain(domain)) {
			throw new Error("Not an ethereum item")
		}
		const collection = await this.sdk.apis.nftCollection.getNftCollectionById({
			collection: contract,
		})

		const submit = this.sdk.auction.start
			.before(async (request: IStartAuctionRequest) => {
				const { itemId } = getEthereumItemId(request.itemId)
				const item = await this.sdk.apis.nftItem.getNftItemById({ itemId })
				return {
					makeAssetType: { tokenId: item.tokenId, contract: item.contract },
					amount: toBigNumber(request.amount.toString()),
					takeAssetType: getEthTakeAssetType(request.currency),
					minimalStepDecimal: request.minimalStep,
					minimalPriceDecimal: request.minimalPrice,
					duration: request.duration,
					startTime: request.startTime,
					buyOutPriceDecimal: request.buyOutPrice,
					payouts: toEthereumParts(request.payouts),
					originFees: toEthereumParts(request.originFees),
				}
			})
			.after(async tx => {
				const receipt = await tx.wait()
				console.log("receipt", JSON.stringify(receipt, null, "  "))
				const createdEvent = receipt.events.find(e => e.event === "AuctionCreated")
				if (!createdEvent) throw new Error("AuctionCreated event has not been found")
				const auctionHash = this.sdk.auction.getHash(toBigNumber(createdEvent.args.auctionId))
				return convertEthereumToAuctionId(auctionHash, this.blockchain)
			})

		return {
			multiple: collection.type === "ERC1155",
			originFeeSupport: OriginFeeSupport.FULL,
			payoutsSupport: PayoutsSupport.MULTIPLE,
			supportedCurrencies: common.getSupportedCurrencies(),
			baseFee: await this.sdk.order.getBaseOrderFee(),
			submit,
		}
	}
}
