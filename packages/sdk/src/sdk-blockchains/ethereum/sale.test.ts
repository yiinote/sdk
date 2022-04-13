import { awaitAll, createE2eProvider, deployTestErc20, deployTestErc721 } from "@rarible/ethereum-sdk-test-common"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { EthereumWallet } from "@rarible/sdk-wallet"
import { toContractAddress, toCurrencyId, toItemId, toOrderId } from "@rarible/types"
import { sentTx } from "@rarible/protocol-ethereum-sdk/build/common/send-transaction"
import Web3 from "web3"
import { Platform } from "@rarible/ethereum-api-client"
import { createRaribleSdk } from "../../index"
import { LogsLevel } from "../../domain"
import { initProviders } from "./test/init-providers"
import { awaitStock } from "./test/await-stock"
import { awaitItem } from "./test/await-item"

describe("sale", () => {
	const { web31, web32, wallet1, wallet2 } = initProviders()
	const ethereum1 = new Web3Ethereum({ web3: web31 })
	const ethereum2 = new Web3Ethereum({ web3: web32 })
	const sdk1 = createRaribleSdk(new EthereumWallet(ethereum1), "development", { logs: LogsLevel.DISABLED })
	const sdk2 = createRaribleSdk(new EthereumWallet(ethereum2), "development", { logs: LogsLevel.DISABLED })

	const conf = awaitAll({
		testErc20: deployTestErc20(web31, "Test1", "TST1"),
		testErc721: deployTestErc721(web31, "Test2", "TST2"),
	})

	test("erc721 sell/buy using erc-20", async () => {
		const wallet1Address = wallet1.getAddressString()
		const wallet2Address = wallet2.getAddressString()
		const tokenId = 1
		await sentTx(
			conf.testErc721.methods.mint(wallet1Address, tokenId, ""),
			{ from: wallet1Address, gas: 200000 }
		)
		await sentTx(
			conf.testErc20.methods.mint(wallet2Address, 100),
			{ from: wallet1Address, gas: 200000 }
		)
		const itemId = toItemId(`ETHEREUM:${conf.testErc721.options.address}:${tokenId}`)

		await awaitItem(sdk1, itemId)

		const sellAction = await sdk1.order.sell({ itemId })
		const orderId = await sellAction.submit({
			amount: 1,
			price: "0.000000000000000002",
			currency: {
				"@type": "ERC20",
				contract: toContractAddress(`ETHEREUM:${conf.testErc20.options.address}`),
			},
			expirationDate: new Date(Date.now() + 200000),
		})

		const nextStock = "1"
		const order = await awaitStock(sdk1, orderId, nextStock)
		expect(order.makeStock.toString()).toEqual(nextStock)

		const updateAction = await sdk1.order.sellUpdate({ orderId })
		await updateAction.submit({ price: "0.000000000000000001" })

		await sdk1.apis.order.getOrderById({ id: orderId })

		const fillAction = await sdk2.order.buy({ orderId })

		const tx = await fillAction.submit({ amount: 1 })
		await tx.wait()

		const nextStock2 = "0"
		const order2 = await awaitStock(sdk1, orderId, nextStock2)
		expect(order2.makeStock.toString()).toEqual(nextStock2)
	})

	test("erc721 sell/buy using erc-20 with order object", async () => {
		const wallet1Address = wallet1.getAddressString()
		const wallet2Address = wallet2.getAddressString()
		const tokenId = 2
		await sentTx(
			conf.testErc721.methods.mint(wallet1Address, tokenId, ""),
			{ from: wallet1Address, gas: 200000 }
		)
		await sentTx(
			conf.testErc20.methods.mint(wallet2Address, 100),
			{ from: wallet1Address, gas: 200000 }
		)
		const itemId = toItemId(`ETHEREUM:${conf.testErc721.options.address}:${tokenId}`)

		await awaitItem(sdk1, itemId)

		const sellAction = await sdk1.order.sell({ itemId })
		const orderId = await sellAction.submit({
			amount: 1,
			price: "0.000000000000000002",
			currency: {
				"@type": "ERC20",
				contract: toContractAddress(`ETHEREUM:${conf.testErc20.options.address}`),
			},
		})

		const nextStock = "1"
		const order = await awaitStock(sdk1, orderId, nextStock)
		expect(order.makeStock.toString()).toEqual(nextStock)

		const fillAction = await sdk2.order.buy({ order })

		const tx = await fillAction.submit({ amount: 1 })
		await tx.wait()

		const nextStock2 = "0"
		const order2 = await awaitStock(sdk1, orderId, nextStock2)
		expect(order2.makeStock.toString()).toEqual(nextStock2)
	})

	test.skip("erc721 sell/buy using erc-20 throw error with outdated expiration date", async () => {
		const wallet1Address = wallet1.getAddressString()
		const wallet2Address = wallet2.getAddressString()
		const tokenId = 3
		await sentTx(
			conf.testErc721.methods.mint(wallet1Address, tokenId, ""),
			{ from: wallet1Address, gas: 200000 }
		)
		await sentTx(
			conf.testErc20.methods.mint(wallet2Address, 100),
			{ from: wallet1Address, gas: 200000 }
		)
		const itemId = toItemId(`ETHEREUM:${conf.testErc721.options.address}:${tokenId}`)

		await awaitItem(sdk1, itemId)

		const sellAction = await sdk1.order.sell({ itemId })
		const orderId = await sellAction.submit({
			amount: 1,
			price: "0.000000000000000002",
			currency: {
				"@type": "ERC20",
				contract: toContractAddress(`ETHEREUM:${conf.testErc20.options.address}`),
			},
			expirationDate: new Date(),
		})

		const nextStock = "1"
		const order = await awaitStock(sdk1, orderId, nextStock)
		expect(order.makeStock.toString()).toEqual(nextStock)

		const fillAction = await sdk2.order.buy({ orderId })

		let errorMessage
		try {
			const tx = await fillAction.submit({ amount: 1 })
			await tx.wait()
		} catch (e: any) {
			errorMessage = e.message
		}
		expect(errorMessage).toBeTruthy()
	})

	test("erc721 sell/buy using erc-20 with CurrencyId", async () => {
		const wallet1Address = wallet1.getAddressString()
		const wallet2Address = wallet2.getAddressString()
		const tokenId = 4
		await sentTx(
			conf.testErc721.methods.mint(wallet1Address, tokenId, ""),
			{ from: wallet1Address, gas: 200000 }
		)
		await sentTx(
			conf.testErc20.methods.mint(wallet2Address, 100),
			{ from: wallet1Address, gas: 200000 }
		)
		const itemId = toItemId(`ETHEREUM:${conf.testErc721.options.address}:${tokenId}`)

		await awaitItem(sdk1, itemId)

		const sellAction = await sdk1.order.sell({ itemId })
		const orderId = await sellAction.submit({
			amount: 1,
			price: "0.000000000000000002",
			currency: toCurrencyId(`ETHEREUM:${conf.testErc20.options.address}`),
		})

		const nextStock = "1"
		const order = await awaitStock(sdk1, orderId, nextStock)
		expect(order.makeStock.toString()).toEqual(nextStock)

		const fillAction = await sdk2.order.buy({ order })

		const tx = await fillAction.submit({ amount: 1 })
		await tx.wait()

		const nextStock2 = "0"
		const order2 = await awaitStock(sdk1, orderId, nextStock2)
		expect(order2.makeStock.toString()).toEqual(nextStock2)
	})
})

describe.skip("buy item with opensea order", () => {
	const { provider } = createE2eProvider(undefined, {
		rpcUl: "https://node-rinkeby.rarible.com",
		networkId: 4,
	})

	const web3 = new Web3(provider)
	const ethereum1 = new Web3Ethereum({ web3 })
	const sdk1 = createRaribleSdk(new EthereumWallet(ethereum1), "staging", {
		logs: LogsLevel.DISABLED,
		ethereum: {
			openseaOrdersPlatform: Platform.CRYPTO_PUNKS,
		},
	})

	test("buy opensea item with specifying origin", async () => {
		const orderId = toOrderId("ETHEREUM:0x298fab77f8c8af0f4adf014570287689f7b9228307eaaf657a7446bc8eab0bc1")

		const fillAction = await sdk1.order.buy({ orderId })
		const tx = await fillAction.submit({ amount: 1 })
		await tx.wait()
	})
})
