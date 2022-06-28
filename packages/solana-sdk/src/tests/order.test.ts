import { toPublicKey } from "@rarible/solana-common"
import { SolanaSdk } from "../sdk/sdk"
import { delay, genTestWallet, getTestWallet, mintToken, requestSol, TEST_AUCTION_HOUSE } from "./common"

describe("solana order sdk", () => {
	const sdk = SolanaSdk.create({ connection: { cluster: "devnet" }, debug: true })

	beforeAll(async () => {
		const wallet1 = getTestWallet(0)
		const wallet2 = getTestWallet(1)
		await requestSol(sdk.connection, wallet1.publicKey, 1)
		console.log("fund 1 wallet, awaiting...")
		await delay(10000)
		await requestSol(sdk.connection, wallet2.publicKey, 1)
		console.log("fund 2 wallet")

	})

	test("Should sell & buy nft", async () => {
		const sellerWallet = getTestWallet()
		const { mint } = await mintToken({ sdk, wallet: sellerWallet })

		const price = 0.01
		const tokenAmount = 1

		const { txId: sellTxId } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(TEST_AUCTION_HOUSE),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(sellTxId).toBeTruthy()

		const buyerWallet = genTestWallet()
		await requestSol(sdk.connection, buyerWallet.publicKey, 0.1)

		const { txId: buyTxId } = await (await sdk.order.buy({
			auctionHouse: toPublicKey(TEST_AUCTION_HOUSE),
			signer: buyerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(buyTxId).toBeTruthy()

		console.log(JSON.stringify({
			auctionHouse: TEST_AUCTION_HOUSE,
			sellerWallet: sellerWallet.publicKey.toString(),
			buyerWallet: buyerWallet.publicKey.toString(),
			mint: mint,
		}, null, " "))

		const { txId: finalTxId } = await (await sdk.order.executeSell({
			auctionHouse: toPublicKey(TEST_AUCTION_HOUSE),
			signer: buyerWallet,
			buyerWallet: buyerWallet.publicKey,
			sellerWallet: sellerWallet.publicKey,
			tokensAmount: tokenAmount,
			mint: mint,
			price: price,
		})).submit("max")

		expect(finalTxId).toBeTruthy()
	})


	test("Should buy & execute sell in one call", async () => {
		const sellerWallet = getTestWallet()
		const { mint } = await mintToken({ sdk, wallet: sellerWallet })

		const price = 0.01
		const tokenAmount = 1

		const { txId: sellTxId } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(TEST_AUCTION_HOUSE),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(sellTxId).toBeTruthy()

		const buyerWallet = genTestWallet()
		await requestSol(sdk.connection, buyerWallet.publicKey, 0.1)

		const buyPrepare = await sdk.order.buy({
			auctionHouse: toPublicKey(TEST_AUCTION_HOUSE),
			signer: buyerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})

		const executeSellPrepare = await sdk.order.executeSell({
			auctionHouse: toPublicKey(TEST_AUCTION_HOUSE),
			signer: buyerWallet,
			buyerWallet: buyerWallet.publicKey,
			sellerWallet: sellerWallet.publicKey,
			tokensAmount: tokenAmount,
			mint: mint,
			price: price,
		})

		const finalTx = await sdk.unionInstructionsAndSend(
			buyerWallet,
			[buyPrepare, executeSellPrepare],
			"max"
		)

		expect(finalTx.txId).toBeTruthy()
	})

	test("Should make bid & sell nft", async () => {
		const sellerWallet = getTestWallet()
		const auctionHouse = "8Qu3azqi31VpgPwVW99AyiBGnLSpookWQiwLMvFn4NFm"
		const { mint } = await mintToken({ sdk, wallet: sellerWallet })

		const price = 0.01
		const tokenAmount = 1

		const buyerWallet = genTestWallet()
		await requestSol(sdk.connection, buyerWallet.publicKey, 0.1)

		const { txId: buyTxId } = await (await sdk.order.buy({
			auctionHouse: toPublicKey(auctionHouse),
			signer: buyerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(buyTxId).toBeTruthy()

		const { txId: sellTxId } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(sellTxId).toBeTruthy()

		console.log(JSON.stringify({
			auctionHouse,
			sellerWallet: sellerWallet.publicKey.toString(),
			buyerWallet: buyerWallet.publicKey.toString(),
			mint: mint,
		}, null, " "))

		const { txId: finalTxId } = await (await sdk.order.executeSell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			buyerWallet: buyerWallet.publicKey,
			sellerWallet: sellerWallet.publicKey,
			tokensAmount: tokenAmount,
			mint: mint,
			price: price,
		})).submit("max")
		expect(finalTxId).toBeTruthy()
	})

	test("Should sell & cancel", async () => {
		const sellerWallet = getTestWallet()
		const auctionHouse = "8Qu3azqi31VpgPwVW99AyiBGnLSpookWQiwLMvFn4NFm"
		const mint = toPublicKey("6APnUDJXkTAbT5tpKr3WeMGQ74p1QcXZjLR6erpnLM8P")

		const price = 0.01
		const tokenAmount = 1

		const { txId: sellTxId } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(sellTxId).toBeTruthy()

		const { txId } = await (await sdk.order.cancel({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(txId).toBeTruthy()
	})

	test("Should buy & cancel", async () => {
		const sellerWallet = getTestWallet()
		const auctionHouse = "8Qu3azqi31VpgPwVW99AyiBGnLSpookWQiwLMvFn4NFm"
		const mint = toPublicKey("6APnUDJXkTAbT5tpKr3WeMGQ74p1QcXZjLR6erpnLM8P")

		const price = 0.01
		const tokenAmount = 1

		const { txId: sellTxId } = await (await sdk.order.buy({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(sellTxId).toBeTruthy()

		const { txId } = await (await sdk.order.cancel({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(txId).toBeTruthy()
	})

	test("Should set big sell price", async () => {
		const sellerWallet = getTestWallet()
		const auctionHouse = "8Qu3azqi31VpgPwVW99AyiBGnLSpookWQiwLMvFn4NFm"
		const { mint } = await mintToken({ sdk, wallet: sellerWallet })

		const price = "1000000000"
		const tokenAmount = 1

		const { txId: sellTxId } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: sellerWallet,
			price: price,
			tokensAmount: tokenAmount,
			mint: mint,
		})).submit("max")
		expect(sellTxId).toBeTruthy()
		console.log(sellTxId)
	})

	test("Should sell & transfer & buy", async () => {
		const wallet1 = getTestWallet(0)
		const wallet2 = getTestWallet(1)
		const auctionHouse = "8Qu3azqi31VpgPwVW99AyiBGnLSpookWQiwLMvFn4NFm"
		const { mint, tokenAccount } = await mintToken({ sdk, wallet: wallet1 })

		// wallet1 put item to sell
		const { txId: sellTxId } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: wallet1,
			price: 0.001,
			tokensAmount: 1,
			mint: mint,
		})).submit("max")
		await sdk.confirmTransaction(sellTxId, "finalized")

		// wallet1 transfer item to wallet2
		const { txId: transferTxId } = await (await sdk.nft.transfer({
			signer: wallet1,
			mint: mint,
			tokenAccount: tokenAccount.value[0].pubkey,
			to: wallet2.publicKey,
			amount: 1,
		})).submit("max")
		await sdk.confirmTransaction(transferTxId, "finalized")

		// wallet2 put item to sell
		const { txId: sellTxId2 } = await (await sdk.order.sell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: wallet2,
			price: 0.002,
			tokensAmount: 1,
			mint: mint,
		})).submit("max")
		await sdk.confirmTransaction(sellTxId2, "finalized")

		//wallet1 buying item
		const { txId: buyTxId } = await (await sdk.order.buy({
			auctionHouse: toPublicKey(auctionHouse),
			signer: wallet1,
			price: 0.002,
			tokensAmount: 1,
			mint: mint,
		})).submit("max")

		await sdk.confirmTransaction(buyTxId, "finalized")

		const { txId: finalTxId } = await (await sdk.order.executeSell({
			auctionHouse: toPublicKey(auctionHouse),
			signer: wallet1,
			buyerWallet: wallet1.publicKey,
			sellerWallet: wallet2.publicKey,
			tokensAmount: 1,
			mint: mint,
			price: 0.002,
		})).submit("max")
		await sdk.confirmTransaction(finalTxId, "finalized")

	})
})