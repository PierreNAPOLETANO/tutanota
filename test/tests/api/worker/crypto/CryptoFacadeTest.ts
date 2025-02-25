import o from "ospec"
import {
	arrayEquals,
	base64ToUint8Array,
	downcast,
	hexToUint8Array,
	isSameTypeRef,
	neverNull,
	stringToUtf8Uint8Array,
	uint8ArrayToBase64,
	utf8Uint8ArrayToString,
} from "@tutao/tutanota-utils"
import { CryptoFacade } from "../../../../../src/api/worker/crypto/CryptoFacade.js"
import { ProgrammingError } from "../../../../../src/api/common/error/ProgrammingError.js"
import { Cardinality, ValueType } from "../../../../../src/api/common/EntityConstants.js"
import { BucketPermissionType, PermissionType } from "../../../../../src/api/common/TutanotaConstants.js"
import * as Contact from "../../../../../src/api/entities/tutanota/TypeRefs.js"
import {
	ContactTypeRef,
	createBirthday,
	createContact,
	createContactAddress,
	createFile,
	FileTypeRef,
	Mail,
	MailAddressTypeRef,
	MailDetailsBlobTypeRef,
	MailTypeRef,
} from "../../../../../src/api/entities/tutanota/TypeRefs.js"
import * as UserIdReturn from "../../../../../src/api/entities/sys/TypeRefs.js"
import {
	BucketKey,
	BucketKeyTypeRef,
	BucketPermissionTypeRef,
	createBucket,
	createBucketKey,
	createBucketPermission,
	createGroup,
	createGroupMembership,
	createInstanceSessionKey,
	createKeyPair,
	createPermission,
	createTypeInfo,
	createUser,
	createUserIdReturn,
	GroupTypeRef,
	PermissionTypeRef,
	UpdatePermissionKeyData,
	UserIdReturnTypeRef,
} from "../../../../../src/api/entities/sys/TypeRefs.js"
import { assertThrows } from "@tutao/tutanota-test-utils"
import { RestClient } from "../../../../../src/api/worker/rest/RestClient.js"
import { EntityClient } from "../../../../../src/api/common/EntityClient.js"
import {
	aes128Decrypt,
	aes128Encrypt,
	aes128RandomKey,
	bitArrayToUint8Array,
	decryptKey,
	ENABLE_MAC,
	encryptKey,
	encryptRsaKey,
	hexToPrivateKey,
	hexToPublicKey,
	IV_BYTE_LENGTH,
	random,
} from "@tutao/tutanota-crypto"
import { RsaWeb } from "../../../../../src/api/worker/crypto/RsaImplementation.js"
import { decryptValue, encryptValue, InstanceMapper } from "../../../../../src/api/worker/crypto/InstanceMapper.js"
import type { ModelValue, TypeModel } from "../../../../../src/api/common/EntityTypes.js"
import { IServiceExecutor } from "../../../../../src/api/common/ServiceRequest.js"
import { matchers, object, verify, when } from "testdouble"
import { UpdatePermissionKeyService } from "../../../../../src/api/entities/sys/Services.js"
import { getListId, isSameId } from "../../../../../src/api/common/utils/EntityUtils.js"
import { resolveTypeReference, typeModels } from "../../../../../src/api/common/EntityFunctions.js"
import { UserFacade } from "../../../../../src/api/worker/facades/UserFacade.js"
import { SessionKeyNotFoundError } from "../../../../../src/api/common/error/SessionKeyNotFoundError.js"
import { OwnerEncSessionKeysUpdateQueue } from "../../../../../src/api/worker/crypto/OwnerEncSessionKeysUpdateQueue.js"

const { anything, captor } = matchers

const rsa = new RsaWeb()
const rsaEncrypt = rsa.encrypt
o.spec("crypto facade", function () {
	let rsaPrivateHexKey =
		"02008e8bf43e2990a46042da8168aebec699d62e1e1fd068c5582fd1d5433cee8c8b918799e8ee1a22dd9d6e21dd959d7faed8034663225848c21b88c2733c73788875639425a87d54882285e598bf7e8c83861e8b77ab3cf62c53d35e143cee9bb8b3f36850aebd1548c1881dc7485bb51aa13c5a0391b88a8d7afce88ecd4a7e231ca7cfd063216d1d573ad769a6bb557c251ad34beb393a8fff4a886715315ba9eac0bc31541999b92fcb33d15efd2bd50bf77637d3fc5ba1c21082f67281957832ac832fbad6c383779341555993bd945659d7797b9c993396915e6decee9da2d5e060c27c3b5a9bc355ef4a38088af53e5f795ccc837f45d0583052547a736f02002a7622214a3c5dda96cf83f0ececc3381c06ccce69446c54a299fccef49d929c1893ae1326a9fe6cc9727f00048b4ff7833d26806d40a31bbf1bf3e063c779c61c41b765a854fd1338456e691bd1d48571343413479cf72fa920b34b9002fbbbff4ea86a3042fece17683686a055411357a824a01f8e3b277dd54c690d59fd4c8258009707d917ce43d4a337dc58bb55394c4f87b902e7f78fa0abe35e35444bda46bfbc38cf87c60fbe5c4beff49f8e6ddbf50d6caafeb92a6ccef75474879bdb82c9c9c5c35611207dbdb7601c87b254927f4d9fd25ba7694987b5ca70c8184058a91e86cb974a2b7694d6bb08a349b953e4c9a017d9eecada49eb2981dfe10100c7905e44c348447551bea10787da3aa869bbe45f10cff87688e2696474bd18405432f4846dcee886d2a967a61c1adb9a9bc08d75cee678053bf41262f0d9882c230bd5289518569714b961cec3072ed2900f52c9cdc802ee4e63781a3c4acaee4347bd9ab701399a0b96cdf22a75501f7f232069e7f00f5649be5ac3d73edd970100b6dbc3e909e1b69ab3f5dd6a55d7cc68d2b803d3da16941410ab7a5b963e5c50316a52380d4b571633d870ca746b4d6f36e0a9d90cf96a2ddb9c61d5bc9dbe74473f0be99f3642100c1b8ad9d592c6a28fa6570ccbb3f7bb86be8056f76473b978a55d458343dba3d0dcaf152d225f20ccd384706dda9dd2fb0f5f6976e603e901002fd80cc1af8fc3d9dc9f373bf6f5fada257f46610446d7ea9326b4ddc09f1511571e6040df929b6cb754a5e4cd18234e0dc93c20e2599eaca29301557728afdce50a1130898e2c344c63a56f4c928c472f027d76a43f2f74b2966654e3df8a8754d9fe3af964f1ca5cbceae3040adc0ab1105ad5092624872b66d79bdc1ed6410100295bc590e4ea4769f04030e747293b138e6d8e781140c01755b9e33fe9d88afa9c62a6dc04adc0b1c5e23388a71249fe589431f664c7d8eb2c5bcf890f53426b7c5dd72ced14d1965d96b12e19ef4bbc22ef858ae05c01314a05b673751b244d93eb1b1088e3053fa512f50abe1da314811f6a3a1faeadb9b58d419052132e59010032611a3359d91ce3567675726e48aca0601def22111f73a9fea5faeb9a95ec37754d2e52d7ae9444765c39c66264c02b38d096df1cebe6ea9951676663301e577fa5e3aec29a660e0fff36389671f47573d2259396874c33069ddb25dd5b03dcbf803272e68713c320ef7db05765f1088473c9788642e4b80a8eb40968fc0d7c"
	let rsaPublicHexKey =
		"02008e8bf43e2990a46042da8168aebec699d62e1e1fd068c5582fd1d5433cee8c8b918799e8ee1a22dd9d6e21dd959d7faed8034663225848c21b88c2733c73788875639425a87d54882285e598bf7e8c83861e8b77ab3cf62c53d35e143cee9bb8b3f36850aebd1548c1881dc7485bb51aa13c5a0391b88a8d7afce88ecd4a7e231ca7cfd063216d1d573ad769a6bb557c251ad34beb393a8fff4a886715315ba9eac0bc31541999b92fcb33d15efd2bd50bf77637d3fc5ba1c21082f67281957832ac832fbad6c383779341555993bd945659d7797b9c993396915e6decee9da2d5e060c27c3b5a9bc355ef4a38088af53e5f795ccc837f45d0583052547a736f"
	let restClient

	let instanceMapper = new InstanceMapper()
	let serviceExecutor: IServiceExecutor
	let entityClient: EntityClient
	let ownerEncSessionKeysUpdateQueue: OwnerEncSessionKeysUpdateQueue
	let crypto: CryptoFacade
	let userFacade: UserFacade

	o.before(function () {
		const suspensionHandler = downcast({})
		restClient = new RestClient(suspensionHandler)
		userFacade = object()
	})

	o.beforeEach(function () {
		serviceExecutor = object()
		entityClient = object()
		ownerEncSessionKeysUpdateQueue = object()
		crypto = new CryptoFacade(userFacade, entityClient, restClient, rsa, serviceExecutor, instanceMapper, ownerEncSessionKeysUpdateQueue)
	})

	function createValueType(type, encrypted, cardinality): ModelValue & { name: string; since: number } {
		return {
			name: "test",
			id: 426,
			since: 6,
			type: type,
			cardinality: cardinality,
			final: true,
			encrypted: encrypted,
		}
	}

	o.spec("decrypt value", function () {
		o("decrypt string / number value without mac", function () {
			let sk = aes128RandomKey()
			let value = "this is a string value"
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, false))
			o(decryptValue("test", createValueType(ValueType.String, true, Cardinality.One), encryptedValue, sk)).equals(value)
			value = "516546"
			encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, false))
			o(decryptValue("test", createValueType(ValueType.String, true, Cardinality.One), encryptedValue, sk)).equals(value)
		})
		o("decrypt string / number value with mac", function () {
			let sk = aes128RandomKey()
			let value = "this is a string value"
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			o(decryptValue("test", createValueType(ValueType.String, true, Cardinality.One), encryptedValue, sk)).equals(value)
			value = "516546"
			encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			o(decryptValue("test", createValueType(ValueType.String, true, Cardinality.One), encryptedValue, sk)).equals(value)
		})
		o("decrypt boolean value without mac", function () {
			let valueType: ModelValue = createValueType(ValueType.Boolean, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = "0"
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, false))
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(false)
			value = "1"
			encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, false))
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(true)
			value = "32498"
			encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, false))
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(true)
		})
		o("decrypt boolean value with mac", function () {
			let valueType: ModelValue = createValueType(ValueType.Boolean, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = "0"
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(false)
			value = "1"
			encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(true)
			value = "32498"
			encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(true)
		})
		o("decrypt date value without mac", function () {
			let valueType: ModelValue = createValueType(ValueType.Date, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = new Date().getTime().toString()
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, false))
			o(decryptValue("test", valueType, encryptedValue, sk)).deepEquals(new Date(parseInt(value)))
		})
		o("decrypt date value with mac", function () {
			let valueType: ModelValue = createValueType(ValueType.Date, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = new Date().getTime().toString()
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(value), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			o(decryptValue("test", valueType, encryptedValue, sk)).deepEquals(new Date(parseInt(value)))
		})
		o("decrypt bytes value without mac", function () {
			let valueType: ModelValue = createValueType(ValueType.Bytes, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = random.generateRandomData(5)
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, value, random.generateRandomData(IV_BYTE_LENGTH), true, false))
			let decryptedValue = decryptValue("test", valueType, encryptedValue, sk)
			o(decryptedValue instanceof Uint8Array).equals(true)
			o(Array.from(decryptedValue)).deepEquals(Array.from(value))
		})
		o("decrypt bytes value with mac", function () {
			let valueType: ModelValue = createValueType(ValueType.Bytes, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = random.generateRandomData(5)
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, value, random.generateRandomData(IV_BYTE_LENGTH), true, true))
			let decryptedValue = decryptValue("test", valueType, encryptedValue, sk)
			o(decryptedValue instanceof Uint8Array).equals(true)
			o(Array.from(decryptedValue)).deepEquals(Array.from(value))
		})
		o("decrypt compressedString", function () {
			let valueType: ModelValue = createValueType(ValueType.CompressedString, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = base64ToUint8Array("QHRlc3Q=")
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, value, random.generateRandomData(IV_BYTE_LENGTH), true, true))
			let decryptedValue = decryptValue("test", valueType, encryptedValue, sk)
			o(typeof decryptedValue === "string").equals(true)
			o(decryptedValue).equals("test")
		})
		o("decrypt compressedString w resize", function () {
			let valueType: ModelValue = createValueType(ValueType.CompressedString, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = base64ToUint8Array("X3RleHQgBQD//1FQdGV4dCA=")
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, value, random.generateRandomData(IV_BYTE_LENGTH), true, true))
			let decryptedValue = decryptValue("test", valueType, encryptedValue, sk)
			o(typeof decryptedValue === "string").equals(true)
			o(decryptedValue).equals(
				"text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text text ",
			)
		})
		o("decrypt empty compressedString", function () {
			let valueType: ModelValue = createValueType(ValueType.CompressedString, true, Cardinality.One)
			let sk = aes128RandomKey()
			let encryptedValue = uint8ArrayToBase64(aes128Encrypt(sk, new Uint8Array([]), random.generateRandomData(IV_BYTE_LENGTH), true, true))
			let decryptedValue = decryptValue("test", valueType, encryptedValue, sk)
			o(typeof decryptedValue === "string").equals(true)
			o(decryptedValue).equals("")
		})
		o("do not decrypt null values", function () {
			let sk = aes128RandomKey()
			o(decryptValue("test", createValueType(ValueType.String, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(decryptValue("test", createValueType(ValueType.Date, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(decryptValue("test", createValueType(ValueType.Bytes, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(decryptValue("test", createValueType(ValueType.Boolean, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(decryptValue("test", createValueType(ValueType.Number, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
		})
		o("throw error on ONE null values (String)", makeTestForErrorOnNull(ValueType.String))
		o("throw error on ONE null values (Date)", makeTestForErrorOnNull(ValueType.Date))
		o("throw error on ONE null values (Bytes)", makeTestForErrorOnNull(ValueType.Bytes))
		o("throw error on ONE null values (Boolean)", makeTestForErrorOnNull(ValueType.Boolean))
		o("throw error on ONE null values (Number)", makeTestForErrorOnNull(ValueType.Number))

		function makeTestForErrorOnNull(type) {
			return async () => {
				let sk = aes128RandomKey()

				const e = await assertThrows(ProgrammingError, () => decryptValue("test", createValueType(type, true, Cardinality.One), null, sk))
				o(e.message).equals("Value test with cardinality ONE can not be null")
			}
		}

		o("convert unencrypted Date to JS type", function () {
			let value = new Date().getTime().toString()
			o(decryptValue("test", createValueType(ValueType.Date, false, Cardinality.One), value, null)).deepEquals(new Date(parseInt(value)))
		})
		o("convert unencrypted Bytes to JS type", function () {
			let valueBytes = random.generateRandomData(15)
			let value = uint8ArrayToBase64(valueBytes)
			o(Array.from(decryptValue("test", createValueType(ValueType.Bytes, false, Cardinality.One), value, null))).deepEquals(Array.from(valueBytes))
		})
		o("convert unencrypted Boolean to JS type", function () {
			let value = "0"
			o(decryptValue("test", createValueType(ValueType.Boolean, false, Cardinality.One), value, null)).equals(false)
			value = "1"
			o(decryptValue("test", createValueType(ValueType.Boolean, false, Cardinality.One), value, null)).equals(true)
		})
		o("convert unencrypted Number to JS type", function () {
			let value = ""
			o(decryptValue("test", createValueType(ValueType.Number, false, Cardinality.One), value, null)).equals("0")
			value = "0"
			o(decryptValue("test", createValueType(ValueType.Number, false, Cardinality.One), value, null)).equals("0")
			value = "1"
			o(decryptValue("test", createValueType(ValueType.Number, false, Cardinality.One), value, null)).equals("1")
		})
		o("convert unencrypted compressedString to JS type", function () {
			let value = ""
			o(decryptValue("test", createValueType(ValueType.CompressedString, false, Cardinality.One), value, null)).equals("")
			value = "QHRlc3Q="
			o(decryptValue("test", createValueType(ValueType.CompressedString, false, Cardinality.One), value, null)).equals("test")
		})
	})
	o.spec("encryptValue", function () {
		o("encrypt string / number value", function () {
			const valueType = createValueType(ValueType.String, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = "this is a string value"
			let encryptedValue = neverNull(encryptValue("test", valueType, value, sk))
			let expected = uint8ArrayToBase64(
				aes128Encrypt(
					sk,
					stringToUtf8Uint8Array(value),
					base64ToUint8Array(encryptedValue).slice(ENABLE_MAC ? 1 : 0, ENABLE_MAC ? 17 : 16),
					true,
					ENABLE_MAC,
				),
			)
			o(encryptedValue).equals(expected)
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(value)
		})
		o("encrypt boolean value", function () {
			let valueType: ModelValue = createValueType(ValueType.Boolean, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = false
			let encryptedValue = neverNull(encryptValue("test", valueType, value, sk))
			let expected = uint8ArrayToBase64(
				aes128Encrypt(
					sk,
					stringToUtf8Uint8Array(value ? "1" : "0"),
					base64ToUint8Array(encryptedValue).slice(ENABLE_MAC ? 1 : 0, ENABLE_MAC ? 17 : 16),
					true,
					ENABLE_MAC,
				),
			)
			o(encryptedValue).equals(expected)
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(false)
			value = true
			encryptedValue = neverNull(encryptValue("test", valueType, value, sk))
			expected = uint8ArrayToBase64(
				aes128Encrypt(
					sk,
					stringToUtf8Uint8Array(value ? "1" : "0"),
					base64ToUint8Array(encryptedValue).slice(ENABLE_MAC ? 1 : 0, ENABLE_MAC ? 17 : 16),
					true,
					ENABLE_MAC,
				),
			)
			o(encryptedValue).equals(expected)
			o(decryptValue("test", valueType, encryptedValue, sk)).equals(true)
		})
		o("encrypt date value", function () {
			let valueType: ModelValue = createValueType(ValueType.Date, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = new Date()
			let encryptedValue = neverNull(encryptValue("test", valueType, value, sk))
			let expected = uint8ArrayToBase64(
				aes128Encrypt(
					sk,
					stringToUtf8Uint8Array(value.getTime().toString()),
					base64ToUint8Array(encryptedValue).slice(ENABLE_MAC ? 1 : 0, ENABLE_MAC ? 17 : 16),
					true,
					ENABLE_MAC,
				),
			)
			o(encryptedValue).equals(expected)
			o(decryptValue("test", valueType, encryptedValue, sk)).deepEquals(value)
		})
		o("encrypt bytes value", function () {
			let valueType: ModelValue = createValueType(ValueType.Bytes, true, Cardinality.One)
			let sk = aes128RandomKey()
			let value = random.generateRandomData(5)
			let encryptedValue = neverNull(encryptValue("test", valueType, value, sk))
			let expected = uint8ArrayToBase64(
				aes128Encrypt(sk, value, base64ToUint8Array(encryptedValue).slice(ENABLE_MAC ? 1 : 0, ENABLE_MAC ? 17 : 16), true, ENABLE_MAC),
			)
			o(encryptedValue).equals(expected)
			o(Array.from(decryptValue("test", valueType, encryptedValue, sk))).deepEquals(Array.from(value))
		})
		o("do not encrypt null values", function () {
			let sk = aes128RandomKey()
			o(encryptValue("test", createValueType(ValueType.String, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(encryptValue("test", createValueType(ValueType.Date, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(encryptValue("test", createValueType(ValueType.Bytes, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(encryptValue("test", createValueType(ValueType.Boolean, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
			o(encryptValue("test", createValueType(ValueType.Number, true, Cardinality.ZeroOrOne), null, sk)).equals(null)
		})
		o("accept null _id and _permissions value during encryption", function () {
			let vt: ModelValue = {
				id: 426,
				type: ValueType.GeneratedId,
				cardinality: Cardinality.One,
				final: true,
				encrypted: false,
			}
			o(encryptValue("_id", vt, null, null)).equals(null)
			o(encryptValue("_permissions", vt, null, null)).equals(null)
		})
		o("throw error on ONE null values (enc String)", makeTestForErrorOnNull(ValueType.String))
		o("throw error on ONE null values (enc Date)", makeTestForErrorOnNull(ValueType.Date))
		o("throw error on ONE null values (enc Bytes)", makeTestForErrorOnNull(ValueType.Bytes))
		o("throw error on ONE null values (enc Boolean)", makeTestForErrorOnNull(ValueType.Boolean))
		o("throw error on ONE null values (enc Number)", makeTestForErrorOnNull(ValueType.Number))

		function makeTestForErrorOnNull(type) {
			return async () => {
				let sk = aes128RandomKey()

				const e = await assertThrows(ProgrammingError, async () => encryptValue("test", createValueType(type, true, Cardinality.One), null, sk))
				o(e.message).equals("Value test with cardinality ONE can not be null")
			}
		}

		o("convert unencrypted Date to DB type", function () {
			let value = new Date()
			o(encryptValue("test", createValueType(ValueType.Date, false, Cardinality.One), value, null)).equals(value.getTime().toString())
		})

		o("convert unencrypted Bytes to DB type", function () {
			let valueBytes = random.generateRandomData(15)
			o(encryptValue("test", createValueType(ValueType.Bytes, false, Cardinality.One), valueBytes, null)).equals(uint8ArrayToBase64(valueBytes))
		})

		o("convert unencrypted Boolean to DB type", function () {
			let value = false
			o(encryptValue("test", createValueType(ValueType.Boolean, false, Cardinality.One), value, null)).equals("0")
			value = true
			o(encryptValue("test", createValueType(ValueType.Boolean, false, Cardinality.One), value, null)).equals("1")
		})

		o("convert unencrypted Number to DB type", function () {
			let value = "0"
			o(encryptValue("test", createValueType(ValueType.Number, false, Cardinality.One), value, null)).equals("0")
			value = "1"
			o(encryptValue("test", createValueType(ValueType.Number, false, Cardinality.One), value, null)).equals("1")
		})
	})

	function createMailLiteral(gk, sk, subject, confidential, senderName, recipientName): Record<string, any> {
		return {
			_format: "0",
			_area: "0",
			_owner: "ownerId",
			_ownerGroup: "mailGroupId",
			_ownerEncSessionKey: encryptKey(gk, sk),
			_id: ["mailListId", "mailId"],
			_permissions: "permissionListId",
			receivedDate: new Date(1470039025474).getTime().toString(),
			sentDate: new Date(1470039021474).getTime().toString(),
			state: "",
			trashed: false,
			unread: true,
			subject: uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(subject), random.generateRandomData(IV_BYTE_LENGTH), true, ENABLE_MAC)),
			replyType: "",
			confidential: uint8ArrayToBase64(
				aes128Encrypt(sk, stringToUtf8Uint8Array(confidential ? "1" : "0"), random.generateRandomData(IV_BYTE_LENGTH), true, ENABLE_MAC),
			),
			sender: {
				_id: "senderId",
				address: "hello@tutao.de",
				name: uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(senderName), random.generateRandomData(IV_BYTE_LENGTH), true, ENABLE_MAC)),
			},
			bccRecipients: [],
			ccRecipients: [],
			toRecipients: [
				{
					_id: "recipientId",
					address: "support@yahoo.com",
					name: uint8ArrayToBase64(
						aes128Encrypt(sk, stringToUtf8Uint8Array(recipientName), random.generateRandomData(IV_BYTE_LENGTH), true, ENABLE_MAC),
					),
				},
			],
			replyTos: [],
			bucketKey: null,
			attachmentCount: "0",
			authStatus: "0",
			listUnsubscribe: uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(""), random.generateRandomData(IV_BYTE_LENGTH), true, ENABLE_MAC)),
			method: uint8ArrayToBase64(aes128Encrypt(sk, stringToUtf8Uint8Array(""), random.generateRandomData(IV_BYTE_LENGTH), true, ENABLE_MAC)),
			phishingStatus: "0",
			recipientCount: "0",
		}
	}

	o("decrypt instance", async function () {
		o.timeout(1000)
		let subject = "this is our subject"
		let confidential = true
		let senderName = "TutanotaTeam"
		let recipientName = "Yahoo"
		let gk = aes128RandomKey()
		let sk = aes128RandomKey()
		let mail = createMailLiteral(gk, sk, subject, confidential, senderName, recipientName)
		const MailTypeModel = await resolveTypeReference(MailTypeRef)
		return instanceMapper.decryptAndMapToInstance<Mail>(MailTypeModel, mail, sk).then((decrypted) => {
			o(isSameTypeRef(decrypted._type, MailTypeRef)).equals(true)
			o(decrypted.receivedDate.getTime()).equals(1470039025474)
			o(neverNull(decrypted.sentDate).getTime()).equals(1470039021474)
			o(decrypted.confidential).equals(confidential)
			o(decrypted.subject).equals(subject)
			o(decrypted.replyType).equals("0")
			// aggregates
			o(isSameTypeRef(decrypted.sender._type, MailAddressTypeRef)).equals(true)
			o(decrypted.sender.name).equals(senderName)
			o(decrypted.sender.address).equals("hello@tutao.de")
			o(decrypted.toRecipients[0].name).equals(recipientName)
			o(decrypted.toRecipients[0].address).equals("support@yahoo.com")
		})
	})

	o("encrypt instance", async function () {
		let sk = aes128RandomKey()
		let address = createContactAddress()
		address.type = "0"
		address.address = "Entenhausen"
		address.customTypeName = "0"
		let contact = Contact.createContact()
		contact._area = "0"
		contact._owner = "123"
		contact.title = "Dr."
		contact.firstName = "Max"
		contact.lastName = "Meier"
		contact.comment = "what?"
		contact.company = "WIW"
		contact.autoTransmitPassword = "stop bugging me!"
		contact.addresses = [address]
		const ContactTypeModel = await resolveTypeReference(ContactTypeRef)
		const result: any = await instanceMapper.encryptAndMapToLiteral(ContactTypeModel, contact, sk)
		o(result._format).equals("0")
		o(result._ownerGroup).equals(null)
		o(result._ownerEncSessionKey).equals(null)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.addresses[0].type)))).equals(contact.addresses[0].type)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.addresses[0].address)))).equals(contact.addresses[0].address)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.addresses[0].customTypeName)))).equals(contact.addresses[0].customTypeName)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.title)))).equals(contact.title)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.firstName)))).equals(contact.firstName)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.lastName)))).equals(contact.lastName)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.comment)))).equals(contact.comment)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.company)))).equals(contact.company)
		o(utf8Uint8ArrayToString(aes128Decrypt(sk, base64ToUint8Array(result.autoTransmitPassword)))).equals(contact.autoTransmitPassword)
	})

	o("map unencrypted to instance", async function () {
		let userIdLiteral = {
			_format: "0",
			userId: "KOBqO7a----0",
		}
		const UserIdReturnTypeModel = await resolveTypeReference(UserIdReturnTypeRef)
		const userIdReturn: UserIdReturn.UserIdReturn = await instanceMapper.decryptAndMapToInstance(UserIdReturnTypeModel, userIdLiteral, null)
		o(userIdReturn._format).equals("0")
		o(userIdReturn.userId).equals("KOBqO7a----0")
	})

	o("map unencrypted to DB literal", async function () {
		let userIdReturn = createUserIdReturn()
		userIdReturn._format = "0"
		userIdReturn.userId = "KOBqO7a----0"
		let userIdLiteral = {
			_format: "0",
			userId: "KOBqO7a----0",
		}
		const UserIdReturnTypeModel = await resolveTypeReference(UserIdReturnTypeRef)
		return instanceMapper.encryptAndMapToLiteral(UserIdReturnTypeModel, userIdReturn, null).then((result) => {
			o(result).deepEquals(userIdLiteral)
		})
	})

	o("resolve session key: unencrypted instance", async function () {
		const userIdLiteral = {
			_format: "0",
			userId: "KOBqO7a----0",
		}
		const UserIdReturnTypeModel = await resolveTypeReference(UserIdReturnTypeRef)
		o(await crypto.resolveSessionKey(UserIdReturnTypeModel, userIdLiteral)).equals(null)
	})

	o("resolve session key: _ownerEncSessionKey instance", async function () {
		let subject = "this is our subject"
		let confidential = true
		let senderName = "TutanotaTeam"
		let recipientName = "Yahoo"
		const gk = aes128RandomKey()
		const sk = aes128RandomKey()
		when(userFacade.getGroupKey("mailGroupId")).thenReturn(gk)
		const user = createUser({
			userGroup: createGroupMembership({
				group: "mailGroupId",
			}),
		})
		when(userFacade.isFullyLoggedIn()).thenReturn(true)
		when(userFacade.getLoggedInUser()).thenReturn(user)
		when(userFacade.hasGroup("mailGroupId")).thenReturn(true)
		const mail = createMailLiteral(gk, sk, subject, confidential, senderName, recipientName)

		const MailTypeModel = await resolveTypeReference(MailTypeRef)
		const sessionKey: Aes128Key = neverNull(await crypto.resolveSessionKey(MailTypeModel, mail))

		o(sessionKey).deepEquals(sk)
	})

	o("resolve session key: public key decryption of session key", async function () {
		o.timeout(500) // in CI or with debugging it can take a while

		let subject = "this is our subject"
		let confidential = true
		let senderName = "TutanotaTeam"
		let recipientName = "Yahoo"
		let gk = aes128RandomKey()
		let sk = aes128RandomKey()
		let bk = aes128RandomKey()
		let privateKey = hexToPrivateKey(rsaPrivateHexKey)
		let publicKey = hexToPublicKey(rsaPublicHexKey)
		const keyPair = createKeyPair({
			_id: "keyPairId",
			symEncPrivKey: encryptRsaKey(gk, privateKey),
			pubKey: hexToUint8Array(rsaPublicHexKey),
		})
		const userGroup = createGroup({
			_id: "userGroupId",
			keys: [keyPair],
		})
		const mail = createMailLiteral(gk, sk, subject, confidential, senderName, recipientName)
		// @ts-ignore
		mail._ownerEncSessionKey = null
		const bucket = createBucket({
			bucketPermissions: "bucketPermissionListId",
		})
		const permission = createPermission({
			_id: ["permissionListId", "permissionId"],
			_ownerGroup: userGroup._id,
			bucketEncSessionKey: encryptKey(bk, sk),
			bucket,
			type: PermissionType.Public,
		})
		const pubEncBucketKey = await rsaEncrypt(publicKey, bitArrayToUint8Array(bk))
		const bucketPermission = createBucketPermission({
			_id: ["bucketPermissionListId", "bucketPermissionId"],
			_ownerGroup: userGroup._id,
			type: BucketPermissionType.Public,
			group: userGroup._id,
			pubEncBucketKey,
		})
		const mem = createGroupMembership({
			group: userGroup._id,
		})

		const user = createUser({
			userGroup: mem,
		})
		when(userFacade.getLoggedInUser()).thenReturn(user)
		when(userFacade.getGroupKey("userGroupId")).thenReturn(gk)
		when(userFacade.isLeader()).thenReturn(true)

		when(entityClient.loadAll(BucketPermissionTypeRef, getListId(bucketPermission))).thenResolve([bucketPermission])
		when(entityClient.loadAll(PermissionTypeRef, getListId(permission))).thenResolve([permission])
		when(entityClient.load(GroupTypeRef, userGroup._id)).thenResolve(userGroup)
		when(
			serviceExecutor.post(
				UpdatePermissionKeyService,
				matchers.argThat((p: UpdatePermissionKeyData) => {
					return isSameId(p.permission, permission._id) && isSameId(p.bucketPermission, bucketPermission._id)
				}),
			),
		).thenResolve(undefined)

		const MailTypeModel = await resolveTypeReference(MailTypeRef)
		const sessionKey = neverNull(await crypto.resolveSessionKey(MailTypeModel, mail))

		o(sessionKey).deepEquals(sk)
	})

	o("decryption errors should be written to _errors field", async function () {
		let subject = "this is our subject"
		let confidential = true
		let senderName = "TutanotaTeam"
		let recipientName = "Yahoo"
		let gk = aes128RandomKey()
		let sk = aes128RandomKey()
		let mail = createMailLiteral(gk, sk, subject, confidential, senderName, recipientName)
		mail.subject = "asdf"
		const MailTypeModel = await resolveTypeReference(MailTypeRef)
		const instance: Mail = await instanceMapper.decryptAndMapToInstance(MailTypeModel, mail, sk)
		o(typeof instance._errors["subject"]).equals("string")
	})

	o.spec("instance migrations", function () {
		o.beforeEach(function () {
			when(entityClient.update(matchers.anything())).thenResolve(undefined)
		})
		o("contact migration without birthday", async function () {
			const contact = createContact()

			const migratedContact = await crypto.applyMigrationsForInstance(contact)

			o(migratedContact.birthdayIso).equals(null)
			verify(entityClient.update(matchers.anything()), { times: 0 })
		})

		o("contact migration without existing birthday", async function () {
			const contact = createContact({
				birthdayIso: "2019-05-01",
			})

			const migratedContact = await crypto.applyMigrationsForInstance(contact)

			o(migratedContact.birthdayIso).equals("2019-05-01")
			verify(entityClient.update(matchers.anything()), { times: 0 })
		})

		o("contact migration without existing birthday and oldBirthdayDate", async function () {
			const contact = createContact({
				_id: ["listid", "id"],
				birthdayIso: "2019-05-01",
				oldBirthdayDate: new Date(2000, 4, 1),
			})

			const migratedContact = await crypto.applyMigrationsForInstance(contact)
			o(migratedContact.birthdayIso).equals("2019-05-01")
			o(migratedContact.oldBirthdayAggregate).equals(null)
			o(migratedContact.oldBirthdayDate).equals(null)
			verify(entityClient.update(matchers.anything()), { times: 1 })
		})

		o("contact migration with existing birthday and oldBirthdayAggregate", async function () {
			const contact = createContact({
				_id: ["listid", "id"],
				birthdayIso: "2019-05-01",
				oldBirthdayAggregate: createBirthday({
					day: "01",
					month: "05",
					year: "2000",
				}),
			})

			const migratedContact = await crypto.applyMigrationsForInstance(contact)

			o(migratedContact.birthdayIso).equals("2019-05-01")
			o(migratedContact.oldBirthdayAggregate).equals(null)
			o(migratedContact.oldBirthdayDate).equals(null)
			verify(entityClient.update(matchers.anything()), { times: 1 })
		})

		o("contact migration from oldBirthdayAggregate", async function () {
			const contact = createContact({
				_id: ["listid", "id"],
				oldBirthdayDate: new Date(1800, 4, 1),
				oldBirthdayAggregate: createBirthday({
					day: "01",
					month: "05",
					year: "2000",
				}),
			})

			const migratedContact = await crypto.applyMigrationsForInstance(contact)

			o(migratedContact.birthdayIso).equals("2000-05-01")
			o(migratedContact.oldBirthdayAggregate).equals(null)
			o(migratedContact.oldBirthdayDate).equals(null)
			verify(entityClient.update(matchers.anything()), { times: 1 })
		})

		o("contact migration from oldBirthdayDate", async function () {
			const contact = createContact({
				_id: ["listid", "id"],
				birthdayIso: null,
				oldBirthdayDate: new Date(1800, 4, 1),
				oldBirthdayAggregate: null,
			})

			const migratedContact = await crypto.applyMigrationsForInstance(contact)

			o(migratedContact.birthdayIso).equals("1800-05-01")
			o(migratedContact.oldBirthdayAggregate).equals(null)
			o(migratedContact.oldBirthdayDate).equals(null)
			verify(entityClient.update(matchers.anything()), { times: 1 })
		})

		o("contact migration from oldBirthdayAggregate without year", async function () {
			const contact = createContact({
				_id: ["listid", "id"],
				birthdayIso: null,
				oldBirthdayDate: null,
				oldBirthdayAggregate: createBirthday({
					day: "01",
					month: "05",
					year: null,
				}),
			})

			const migratedContact = await crypto.applyMigrationsForInstance(contact)

			o(migratedContact.birthdayIso).equals("--05-01")
			o(migratedContact.oldBirthdayAggregate).equals(null)
			o(migratedContact.oldBirthdayDate).equals(null)
			verify(entityClient.update(matchers.anything()), { times: 1 })
		})

		o("resolve session key: public key decryption of mail session key using BucketKey aggregated type - Mail referencing MailBody", async function () {
			o.timeout(500) // in CI or with debugging it can take a while
			const testData = await preparePubEncBucketKeyResolveSessionKeyTest()
			Object.assign(testData.mailLiteral, { body: "bodyId" })

			const sessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral))

			o(sessionKey).deepEquals(testData.sk)
			o(crypto.getSessionKeyCache()["bodyId"]).deepEquals(testData.sk)
			o(Object.keys(crypto.getSessionKeyCache()).length).equals(1)
		})

		o("resolve session key: public key decryption of session key using BucketKey aggregated type - Mail referencing MailDetailsDraft", async function () {
			o.timeout(500) // in CI or with debugging it can take a while
			const testData = await preparePubEncBucketKeyResolveSessionKeyTest()
			Object.assign(testData.mailLiteral, { mailDetailsDraft: ["draftDetailsListId", "draftDetailsId"] })

			const sessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral))

			o(sessionKey).deepEquals(testData.sk)
			o(crypto.getSessionKeyCache()["draftDetailsId"]).deepEquals(testData.sk)
			o(Object.keys(crypto.getSessionKeyCache()).length).equals(1)
		})

		o(
			"resolve session key: public key decryption of mail session key using BucketKey aggregated type - already decoded/decrypted Mail referencing MailDetailsDraft",
			async function () {
				o.timeout(500) // in CI or with debugging it can take a while
				const testData = await preparePubEncBucketKeyResolveSessionKeyTest()
				Object.assign(testData.mailLiteral, {
					mailDetailsDraft: ["draftDetailsListId", "draftDetailsId"],
				})

				const mailInstance = await instanceMapper.decryptAndMapToInstance<Mail>(testData.MailTypeModel, testData.mailLiteral, testData.sk)

				// @ts-ignore
				instanceMapper.decryptAndMapToInstance = o.spy(instanceMapper.decryptAndMapToInstance)
				crypto.convertBucketKeyToInstanceIfNecessary = o.spy(crypto.convertBucketKeyToInstanceIfNecessary)

				const sessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, mailInstance))
				o(instanceMapper.decryptAndMapToInstance.callCount).equals(0)
				o(crypto.convertBucketKeyToInstanceIfNecessary.callCount).equals(1)

				o(sessionKey).deepEquals(testData.sk)
				o(crypto.getSessionKeyCache()["draftDetailsId"]).deepEquals(testData.sk)
				o(Object.keys(crypto.getSessionKeyCache()).length).equals(1)
			},
		)

		o("resolve session key: public key decryption of session key using BucketKey aggregated type - Mail referencing MailDetailsBlob", async function () {
			o.timeout(500) // in CI or with debugging it can take a while
			const testData = await preparePubEncBucketKeyResolveSessionKeyTest()
			Object.assign(testData.mailLiteral, { mailDetails: ["mailDetailsArchiveId", "mailDetailsId"] })

			const sessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral))

			o(sessionKey).deepEquals(testData.sk)
			o(crypto.getSessionKeyCache()["mailDetailsId"]).deepEquals(testData.sk)
			o(Object.keys(crypto.getSessionKeyCache()).length).equals(1)
		})

		o(
			"resolve session key: public key decryption of session key using BucketKey aggregated type - Mail referencing MailDetailsBlob with attachments",
			async function () {
				o.timeout(500) // in CI or with debugging it can take a while
				const file1SessionKey = aes128RandomKey()
				const file2SessionKey = aes128RandomKey()
				const testData = await preparePubEncBucketKeyResolveSessionKeyTest([file1SessionKey, file2SessionKey])
				Object.assign(testData.mailLiteral, { mailDetails: ["mailDetailsArchiveId", "mailDetailsId"] })

				const mailSessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral))
				o(mailSessionKey).deepEquals(testData.sk)

				o(Object.keys(crypto.getSessionKeyCache()).length).equals(3)
				o(crypto.getSessionKeyCache()["mailDetailsId"]).deepEquals(testData.sk)
				o(crypto.getSessionKeyCache()["fileId1"]).deepEquals(file1SessionKey)
				o(crypto.getSessionKeyCache()["fileId2"]).deepEquals(file2SessionKey)

				o(testData.bucketKey.bucketEncSessionKeys.length).equals(3) //mail, file1, file2
				const updatedInstanceSessionKeysCaptor = captor()
				verify(ownerEncSessionKeysUpdateQueue.updateInstanceSessionKeys(updatedInstanceSessionKeysCaptor.capture()))
				const updatedInstanceSessionKeys = updatedInstanceSessionKeysCaptor.value
				o(updatedInstanceSessionKeys.length).equals(testData.bucketKey.bucketEncSessionKeys.length)
				testData.bucketKey.bucketEncSessionKeys.forEach((isk) => {
					isk.symEncSessionKey = encryptKey(testData.mailGroupKey, decryptKey(testData.bk, isk.symEncSessionKey))
					o(
						updatedInstanceSessionKeys.some(
							(updatedKey) =>
								updatedKey.instanceId === isk.instanceId &&
								updatedKey.instanceList === isk.instanceList &&
								updatedKey.typeInfo.application === isk.typeInfo.application &&
								updatedKey.typeInfo.typeId === isk.typeInfo.typeId &&
								arrayEquals(updatedKey.symEncSessionKey, isk.symEncSessionKey),
						),
					).equals(true)
				})
			},
		)

		o("resolve session key: file session key is only removed if the file does have an ownerEncSessionKey", async function () {
			o.timeout(500) // in CI or with debugging it can take a while
			const file1SessionKey = aes128RandomKey()
			const testData = await preparePubEncBucketKeyResolveSessionKeyTest([file1SessionKey])
			Object.assign(testData.mailLiteral, { mailDetails: ["mailDetailsArchiveId", "mailDetailsId"] })

			await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral)

			const FileTypeModel = await resolveTypeReference(FileTypeRef)

			let fileInstanceNoOwnerEncSessionKey = createFile({ _id: ["fileListId", "fileId1"], _ownerEncSessionKey: null })

			let fileSessionKey = neverNull(await crypto.resolveSessionKey(FileTypeModel, fileInstanceNoOwnerEncSessionKey))
			o(fileSessionKey).deepEquals(file1SessionKey)
			o(crypto.getSessionKeyCache()["fileId1"]).deepEquals(file1SessionKey)

			const fileInstanceWithOwnerEncSessionKey = createFile({ _id: ["fileListId", "fileId1"], _ownerEncSessionKey: new Uint8Array([1, 2, 3]) })

			fileSessionKey = neverNull(await crypto.resolveSessionKey(FileTypeModel, fileInstanceWithOwnerEncSessionKey))
			o(fileSessionKey).deepEquals(file1SessionKey)
			o(crypto.getSessionKeyCache()["fileId1"]).equals(undefined)
		})
	})

	o(
		"resolve session key: external user key decryption of session key using BucketKey aggregated type encrypted with MailGroupKey - Mail referencing MailDetailsBlob with attachments",
		async function () {
			o.timeout(500) // in CI or with debugging it can take a while
			const file1SessionKey = aes128RandomKey()
			const file2SessionKey = aes128RandomKey()
			const testData = await prepareSymEncBucketKeyResolveSessionKeyTest([file1SessionKey, file2SessionKey])
			Object.assign(testData.mailLiteral, { mailDetails: ["mailDetailsArchiveId", "mailDetailsId"] })

			const mailSessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral))

			o(mailSessionKey).deepEquals(testData.sk)
			o(Object.keys(crypto.getSessionKeyCache()).length).equals(3)
			o(crypto.getSessionKeyCache()["mailDetailsId"]).deepEquals(testData.sk)
			o(crypto.getSessionKeyCache()["fileId1"]).deepEquals(file1SessionKey)
			o(crypto.getSessionKeyCache()["fileId2"]).deepEquals(file2SessionKey)
		},
	)

	o(
		"resolve session key: external user key decryption of session key using BucketKey aggregated type encrypted with UserGroupKey - Mail referencing MailDetailsBlob with attachments",
		async function () {
			o.timeout(500) // in CI or with debugging it can take a while
			const file1SessionKey = aes128RandomKey()
			const file2SessionKey = aes128RandomKey()
			const testData = await prepareSymEncBucketKeyResolveSessionKeyTest([file1SessionKey, file2SessionKey], true)
			Object.assign(testData.mailLiteral, { mailDetails: ["mailDetailsArchiveId", "mailDetailsId"] })

			const mailSessionKey = neverNull(await crypto.resolveSessionKey(testData.MailTypeModel, testData.mailLiteral))

			o(mailSessionKey).deepEquals(testData.sk)
			o(Object.keys(crypto.getSessionKeyCache()).length).equals(3)
			o(crypto.getSessionKeyCache()["mailDetailsId"]).deepEquals(testData.sk)
			o(crypto.getSessionKeyCache()["fileId1"]).deepEquals(file1SessionKey)
			o(crypto.getSessionKeyCache()["fileId2"]).deepEquals(file2SessionKey)
		},
	)

	o("resolve session key from cache: MailDetailsBlob", async function () {
		const sk = aes128RandomKey()
		crypto.getSessionKeyCache()["mailDetailsId"] = sk

		const MailDetailsBlobTypeModel = await resolveTypeReference(MailDetailsBlobTypeRef)
		const mailDetailsBlobLiteral = {
			_id: ["mailDetailsArchiveId", "mailDetailsId"],
		}

		const mailDetailsBlobSessionKey = neverNull(await crypto.resolveSessionKey(MailDetailsBlobTypeModel, mailDetailsBlobLiteral))
		o(mailDetailsBlobSessionKey).deepEquals(sk)
		o(Object.keys(crypto.getSessionKeyCache()).length).equals(1)
	})

	o("resolve session key from cache: MailDetailsBlob - session key not found", async function () {
		const sk = aes128RandomKey()
		crypto.getSessionKeyCache()["otherMailDetailsId"] = sk

		const MailDetailsBlobTypeModel = await resolveTypeReference(MailDetailsBlobTypeRef)
		const mailDetailsBlobLiteral = {
			_id: ["mailDetailsArchiveId", "mailDetailsId"],
			_permissions: "permissionListId",
		}
		when(entityClient.loadAll(PermissionTypeRef, "permissionListId")).thenResolve([])

		try {
			await crypto.resolveSessionKey(MailDetailsBlobTypeModel, mailDetailsBlobLiteral)
			o(true).equals(false) // let the test fails if there is no exception
		} catch (error) {
			o(error.constructor).equals(SessionKeyNotFoundError)
		}
		o(Object.keys(crypto.getSessionKeyCache()).length).equals(1)
	})

	/**
	 * Prepares the environment to test receiving asymmetric encrypted emails that have been sent with the simplified permission system.
	 *  - Creates key pair for the recipient user
	 *  - Creates group, bucket and session keys
	 *  - Creates mail literal and encrypts all encrypted attributes of the mail
	 *  - Create BucketKey object on the mail
	 *
	 * @param fileSessionKeys List of session keys for the attachments. When the list is empty there are no attachments
	 */
	async function preparePubEncBucketKeyResolveSessionKeyTest(fileSessionKeys: Array<Aes128Key> = []): Promise<{
		mailLiteral: Record<string, any>
		bucketKey: BucketKey
		sk: Aes128Key
		bk: Aes128Key
		mailGroupKey: Aes128Key
		MailTypeModel: TypeModel
	}> {
		let subject = "this is our subject"
		let confidential = true
		let senderName = "TutanotaTeam"
		let recipientName = "Yahoo"
		let mailGk = aes128RandomKey()
		let userGk = aes128RandomKey()
		let sk = aes128RandomKey()
		let bk = aes128RandomKey()
		let privateKey = hexToPrivateKey(rsaPrivateHexKey)
		let publicKey = hexToPublicKey(rsaPublicHexKey)
		const keyPair = createKeyPair({
			_id: "keyPairId",
			symEncPrivKey: encryptRsaKey(userGk, privateKey),
			pubKey: hexToUint8Array(rsaPublicHexKey),
		})
		const userGroup = createGroup({
			_id: "userGroupId",
			keys: [keyPair],
		})
		const mailLiteral = createMailLiteral(mailGk, sk, subject, confidential, senderName, recipientName)
		// @ts-ignore
		mailLiteral._ownerEncSessionKey = null

		const pubEncBucketKey = await rsaEncrypt(publicKey, bitArrayToUint8Array(bk))
		const bucketEncMailSessionKey = encryptKey(bk, sk)

		const MailTypeModel = await resolveTypeReference(MailTypeRef)

		typeModels.tutanota
		const mailInstanceSessionKey = createInstanceSessionKey({
			typeInfo: createTypeInfo({
				application: MailTypeModel.app,
				typeId: String(MailTypeModel.id),
			}),
			symEncSessionKey: bucketEncMailSessionKey,
			instanceList: "mailListId",
			instanceId: "mailId",
		})
		const FileTypeModel = await resolveTypeReference(FileTypeRef)
		const bucketEncSessionKeys = fileSessionKeys.map((fileSessionKey, index) => {
			return createInstanceSessionKey({
				typeInfo: createTypeInfo({
					application: FileTypeModel.app,
					typeId: String(FileTypeModel.id),
				}),
				symEncSessionKey: encryptKey(bk, fileSessionKey),
				instanceList: "fileListId",
				instanceId: "fileId" + (index + 1),
			})
		})
		bucketEncSessionKeys.push(mailInstanceSessionKey)

		const bucketKey = createBucketKey({
			pubEncBucketKey: pubEncBucketKey,
			keyGroup: userGroup._id,
			bucketEncSessionKeys: bucketEncSessionKeys,
		})

		const BucketKeyModel = await resolveTypeReference(BucketKeyTypeRef)
		const bucketKeyLiteral = await instanceMapper.encryptAndMapToLiteral(BucketKeyModel, bucketKey, null)
		Object.assign(mailLiteral, { bucketKey: bucketKeyLiteral })

		const mem = createGroupMembership({
			group: userGroup._id,
		})

		const user = createUser({
			userGroup: mem,
		})

		when(userFacade.getLoggedInUser()).thenReturn(user)
		when(userFacade.getGroupKey("userGroupId")).thenReturn(userGk)
		when(userFacade.getGroupKey("mailGroupId")).thenReturn(mailGk)
		when(userFacade.isLeader()).thenReturn(true)

		when(entityClient.load(GroupTypeRef, userGroup._id)).thenResolve(userGroup)

		return {
			mailLiteral,
			bucketKey,
			sk,
			bk,
			mailGroupKey: mailGk,
			MailTypeModel,
		}
	}

	/**
	 * Prepares the environment to test receiving symmetric encrypted emails (mails sent from internal to external user) that have been sent with the simplified permission system.
	 *  - Creates group, bucket and session keys
	 *  - Creates mail literal and encrypts all encrypted attributes of the mail
	 *  - Create BucketKey object on the mail
	 *
	 * @param fileSessionKeys List of session keys for the attachments. When the list is empty there are no attachments
	 */
	async function prepareSymEncBucketKeyResolveSessionKeyTest(
		fileSessionKeys: Array<Aes128Key> = [],
		externalUserGroupEncBucketKey = false,
	): Promise<{
		mailLiteral: Record<string, any>
		sk: Aes128Key
		bk: Aes128Key
		MailTypeModel: TypeModel
	}> {
		let subject = "this is our subject"
		let confidential = true
		let senderName = "TutanotaTeam"
		let recipientName = "Yahoo"
		let gk = aes128RandomKey()
		let sk = aes128RandomKey()
		let bk = aes128RandomKey()
		const ugk = aes128RandomKey()

		const userGroup = createGroup({
			_id: "userGroupId",
			keys: [],
		})
		const mailLiteral = createMailLiteral(gk, sk, subject, confidential, senderName, recipientName)
		// @ts-ignore

		mailLiteral._ownerEncSessionKey = null
		const groupKeyToEncryptBucketKey = externalUserGroupEncBucketKey ? ugk : gk

		const groupEncBucketKey = encryptKey(groupKeyToEncryptBucketKey, bk)
		const bucketEncMailSessionKey = encryptKey(bk, sk)

		const MailTypeModel = await resolveTypeReference(MailTypeRef)

		typeModels.tutanota
		const mailInstanceSessionKey = createInstanceSessionKey({
			typeInfo: createTypeInfo({
				application: MailTypeModel.app,
				typeId: String(MailTypeModel.id),
			}),
			symEncSessionKey: bucketEncMailSessionKey,
			instanceList: "mailListId",
			instanceId: "mailId",
		})
		const FileTypeModel = await resolveTypeReference(FileTypeRef)
		const bucketEncSessionKeys = fileSessionKeys.map((fileSessionKey, index) => {
			return createInstanceSessionKey({
				typeInfo: createTypeInfo({
					application: FileTypeModel.app,
					typeId: String(FileTypeModel.id),
				}),
				symEncSessionKey: encryptKey(bk, fileSessionKey),
				instanceList: "fileListId",
				instanceId: "fileId" + (index + 1),
			})
		})
		bucketEncSessionKeys.push(mailInstanceSessionKey)

		const bucketKey = createBucketKey({
			pubEncBucketKey: null,
			keyGroup: externalUserGroupEncBucketKey ? userGroup._id : null,
			groupEncBucketKey: groupEncBucketKey,
			bucketEncSessionKeys: bucketEncSessionKeys,
		})

		const BucketKeyModel = await resolveTypeReference(BucketKeyTypeRef)
		const bucketKeyLiteral = await instanceMapper.encryptAndMapToLiteral(BucketKeyModel, bucketKey, null)
		Object.assign(mailLiteral, { bucketKey: bucketKeyLiteral })

		const mem = createGroupMembership({
			group: userGroup._id,
		})

		const user = createUser({
			userGroup: mem,
		})

		when(userFacade.getLoggedInUser()).thenReturn(user)
		when(userFacade.getGroupKey("mailGroupId")).thenReturn(gk)
		when(userFacade.getGroupKey(userGroup._id)).thenReturn(ugk)
		when(userFacade.isLeader()).thenReturn(true)

		when(entityClient.load(GroupTypeRef, userGroup._id)).thenResolve(userGroup)

		return {
			mailLiteral,
			sk,
			bk,
			MailTypeModel,
		}
	}
})
