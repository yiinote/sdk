import { toContractAddress, toUnionAddress } from "@rarible/types"
import type { AssetType } from "@rarible/api-client"
import { Blockchain } from "@rarible/api-client"
import BigNumber from "bignumber.js"
import { createRaribleSdk } from "../../index"
import { LogsLevel } from "../../domain"
import { delay } from "../../common/retry"
import { createTestWallet } from "./test/test-wallet"
import { convertTezosToContractAddress, convertTezosToUnionAddress } from "./common"

describe("get balance", () => {
	const sellerWallet = createTestWallet(
		"edskRqrEPcFetuV7xDMMFXHLMPbsTawXZjH9yrEz4RBqH1" +
    "D6H8CeZTTtjGA3ynjTqD8Sgmksi7p5g3u5KUEVqX2EWrRnq5Bymj"
	)
	const sellerSdk = createRaribleSdk(sellerWallet, "dev", { logs: LogsLevel.DISABLED })

	test("get balance XTZ", async () => {
		const balance = await sellerSdk.balances.getBalance(
			toUnionAddress("TEZOS:tz1hnh8ET6dtP2PBQ2yj2T3ZEfMii6kEWR6N"),
			{ "@type": "XTZ" }
		)
		expect(balance.toString()).toEqual("1.0093")
	})

	test("get balance XTZ without wallet", async () => {
		const sellerSdk = createRaribleSdk(undefined, "dev", { logs: LogsLevel.DISABLED })
		const balance = await sellerSdk.balances.getBalance(
			toUnionAddress("TEZOS:tz1hnh8ET6dtP2PBQ2yj2T3ZEfMii6kEWR6N"),
			{ "@type": "XTZ" }
		)
		expect(balance.toString()).toEqual("1.0093")
	})

	test("get balance FT", async () => {
		const balance = await sellerSdk.balances.getBalance(
			toUnionAddress("TEZOS:tz1hnh8ET6dtP2PBQ2yj2T3ZEfMii6kEWR6N"),
			{
				"@type": "TEZOS_FT",
				contract: toContractAddress("TEZOS:KT1LkKaeLBvTBo6knGeN5RsEunERCaqVcLr9"),
			}
		)
		expect(balance.toString()).toEqual("0.03")
	})

	test("get balance FT without wallet", async () => {
		const sellerSdk = createRaribleSdk(undefined, "dev", { logs: LogsLevel.DISABLED })
		const balance = await sellerSdk.balances.getBalance(
			toUnionAddress("TEZOS:tz1hnh8ET6dtP2PBQ2yj2T3ZEfMii6kEWR6N"),
			{
				"@type": "TEZOS_FT",
				contract: toContractAddress("TEZOS:KT1LkKaeLBvTBo6knGeN5RsEunERCaqVcLr9"),
			}
		)
		expect(balance.toString()).toEqual("0.03")
	})

	test("convert from XTZ to wTez", async () => {
		const senderRaw = await sellerWallet.provider.address()
		const wethE2eAssetType: AssetType = {
			"@type": "TEZOS_FT",
			contract: convertTezosToContractAddress("KT1RggVJ1mMaLJezpdsJ6YtBfL7sBfcaGD1H"),
		}
		const sender = convertTezosToUnionAddress(senderRaw)
		const initWethBalance = await sellerSdk.balances.getBalance(sender, wethE2eAssetType)
		const convertTx = await sellerSdk.balances.convert(
			Blockchain.TEZOS,
			true,
			"0.000035"
		)
		await convertTx.wait()

		await delay(2000)
		const finishWethBalance = await sellerSdk.balances.getBalance(sender, wethE2eAssetType)

		expect(finishWethBalance.toString()).toBe(
			new BigNumber(initWethBalance).plus("0.000035").toString()
		)
	})

	test("convert from wTez to XTZ", async () => {
		const senderRaw = await sellerWallet.provider.address()
		const wethE2eAssetType: AssetType = {
			"@type": "TEZOS_FT",
			contract: convertTezosToContractAddress("KT1RggVJ1mMaLJezpdsJ6YtBfL7sBfcaGD1H"),
		}
		const sender = convertTezosToUnionAddress(senderRaw)
		const prepareConvertTx = await sellerSdk.balances.convert(
			Blockchain.TEZOS,
			true,
			"0.000071"
		)
		await prepareConvertTx.wait()

		await delay(2000)
		const initWethBalance = await sellerSdk.balances.getBalance(sender, wethE2eAssetType)
		const convertTx = await sellerSdk.balances.convert(
			Blockchain.TEZOS,
			false,
			"0.000039"
		)
		await convertTx.wait()

		await delay(2000)

		const finishWethBalance = await sellerSdk.balances.getBalance(sender, wethE2eAssetType)

		expect(finishWethBalance.toString()).toBe(
			new BigNumber(initWethBalance).minus("0.000039").toString()
		)
	})
})
