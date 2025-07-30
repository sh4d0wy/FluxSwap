import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type AddRelayer = {
    $$type: 'AddRelayer';
    relayer: Address;
}

export function storeAddRelayer(src: AddRelayer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3378716590, 32);
        b_0.storeAddress(src.relayer);
    };
}

export function loadAddRelayer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3378716590) { throw Error('Invalid prefix'); }
    const _relayer = sc_0.loadAddress();
    return { $$type: 'AddRelayer' as const, relayer: _relayer };
}

export function loadTupleAddRelayer(source: TupleReader) {
    const _relayer = source.readAddress();
    return { $$type: 'AddRelayer' as const, relayer: _relayer };
}

export function loadGetterTupleAddRelayer(source: TupleReader) {
    const _relayer = source.readAddress();
    return { $$type: 'AddRelayer' as const, relayer: _relayer };
}

export function storeTupleAddRelayer(source: AddRelayer) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.relayer);
    return builder.build();
}

export function dictValueParserAddRelayer(): DictionaryValue<AddRelayer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAddRelayer(src)).endCell());
        },
        parse: (src) => {
            return loadAddRelayer(src.loadRef().beginParse());
        }
    }
}

export type RemoveRelayer = {
    $$type: 'RemoveRelayer';
    relayer: Address;
}

export function storeRemoveRelayer(src: RemoveRelayer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3677932325, 32);
        b_0.storeAddress(src.relayer);
    };
}

export function loadRemoveRelayer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3677932325) { throw Error('Invalid prefix'); }
    const _relayer = sc_0.loadAddress();
    return { $$type: 'RemoveRelayer' as const, relayer: _relayer };
}

export function loadTupleRemoveRelayer(source: TupleReader) {
    const _relayer = source.readAddress();
    return { $$type: 'RemoveRelayer' as const, relayer: _relayer };
}

export function loadGetterTupleRemoveRelayer(source: TupleReader) {
    const _relayer = source.readAddress();
    return { $$type: 'RemoveRelayer' as const, relayer: _relayer };
}

export function storeTupleRemoveRelayer(source: RemoveRelayer) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.relayer);
    return builder.build();
}

export function dictValueParserRemoveRelayer(): DictionaryValue<RemoveRelayer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRemoveRelayer(src)).endCell());
        },
        parse: (src) => {
            return loadRemoveRelayer(src.loadRef().beginParse());
        }
    }
}

export type RelayMessage = {
    $$type: 'RelayMessage';
    messageId: bigint;
    sourceChain: string;
    sourceAddress: string;
    destAddress: Address;
    amount: bigint;
    hashlock: bigint;
    timelock: bigint;
    proof: Cell;
}

export function storeRelayMessage(src: RelayMessage) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3048219515, 32);
        b_0.storeInt(src.messageId, 257);
        b_0.storeStringRefTail(src.sourceChain);
        b_0.storeStringRefTail(src.sourceAddress);
        b_0.storeAddress(src.destAddress);
        b_0.storeInt(src.amount, 257);
        const b_1 = new Builder();
        b_1.storeInt(src.hashlock, 257);
        b_1.storeInt(src.timelock, 257);
        b_1.storeRef(src.proof);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadRelayMessage(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3048219515) { throw Error('Invalid prefix'); }
    const _messageId = sc_0.loadIntBig(257);
    const _sourceChain = sc_0.loadStringRefTail();
    const _sourceAddress = sc_0.loadStringRefTail();
    const _destAddress = sc_0.loadAddress();
    const _amount = sc_0.loadIntBig(257);
    const sc_1 = sc_0.loadRef().beginParse();
    const _hashlock = sc_1.loadIntBig(257);
    const _timelock = sc_1.loadIntBig(257);
    const _proof = sc_1.loadRef();
    return { $$type: 'RelayMessage' as const, messageId: _messageId, sourceChain: _sourceChain, sourceAddress: _sourceAddress, destAddress: _destAddress, amount: _amount, hashlock: _hashlock, timelock: _timelock, proof: _proof };
}

export function loadTupleRelayMessage(source: TupleReader) {
    const _messageId = source.readBigNumber();
    const _sourceChain = source.readString();
    const _sourceAddress = source.readString();
    const _destAddress = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    const _proof = source.readCell();
    return { $$type: 'RelayMessage' as const, messageId: _messageId, sourceChain: _sourceChain, sourceAddress: _sourceAddress, destAddress: _destAddress, amount: _amount, hashlock: _hashlock, timelock: _timelock, proof: _proof };
}

export function loadGetterTupleRelayMessage(source: TupleReader) {
    const _messageId = source.readBigNumber();
    const _sourceChain = source.readString();
    const _sourceAddress = source.readString();
    const _destAddress = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    const _proof = source.readCell();
    return { $$type: 'RelayMessage' as const, messageId: _messageId, sourceChain: _sourceChain, sourceAddress: _sourceAddress, destAddress: _destAddress, amount: _amount, hashlock: _hashlock, timelock: _timelock, proof: _proof };
}

export function storeTupleRelayMessage(source: RelayMessage) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.messageId);
    builder.writeString(source.sourceChain);
    builder.writeString(source.sourceAddress);
    builder.writeAddress(source.destAddress);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    builder.writeCell(source.proof);
    return builder.build();
}

export function dictValueParserRelayMessage(): DictionaryValue<RelayMessage> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRelayMessage(src)).endCell());
        },
        parse: (src) => {
            return loadRelayMessage(src.loadRef().beginParse());
        }
    }
}

export type VerifyEthereumMessage = {
    $$type: 'VerifyEthereumMessage';
    txHash: string;
    blockNumber: bigint;
    logIndex: bigint;
    merkleProof: Cell;
    messageData: Cell;
}

export function storeVerifyEthereumMessage(src: VerifyEthereumMessage) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2311478559, 32);
        b_0.storeStringRefTail(src.txHash);
        b_0.storeInt(src.blockNumber, 257);
        b_0.storeInt(src.logIndex, 257);
        b_0.storeRef(src.merkleProof);
        b_0.storeRef(src.messageData);
    };
}

export function loadVerifyEthereumMessage(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2311478559) { throw Error('Invalid prefix'); }
    const _txHash = sc_0.loadStringRefTail();
    const _blockNumber = sc_0.loadIntBig(257);
    const _logIndex = sc_0.loadIntBig(257);
    const _merkleProof = sc_0.loadRef();
    const _messageData = sc_0.loadRef();
    return { $$type: 'VerifyEthereumMessage' as const, txHash: _txHash, blockNumber: _blockNumber, logIndex: _logIndex, merkleProof: _merkleProof, messageData: _messageData };
}

export function loadTupleVerifyEthereumMessage(source: TupleReader) {
    const _txHash = source.readString();
    const _blockNumber = source.readBigNumber();
    const _logIndex = source.readBigNumber();
    const _merkleProof = source.readCell();
    const _messageData = source.readCell();
    return { $$type: 'VerifyEthereumMessage' as const, txHash: _txHash, blockNumber: _blockNumber, logIndex: _logIndex, merkleProof: _merkleProof, messageData: _messageData };
}

export function loadGetterTupleVerifyEthereumMessage(source: TupleReader) {
    const _txHash = source.readString();
    const _blockNumber = source.readBigNumber();
    const _logIndex = source.readBigNumber();
    const _merkleProof = source.readCell();
    const _messageData = source.readCell();
    return { $$type: 'VerifyEthereumMessage' as const, txHash: _txHash, blockNumber: _blockNumber, logIndex: _logIndex, merkleProof: _merkleProof, messageData: _messageData };
}

export function storeTupleVerifyEthereumMessage(source: VerifyEthereumMessage) {
    const builder = new TupleBuilder();
    builder.writeString(source.txHash);
    builder.writeNumber(source.blockNumber);
    builder.writeNumber(source.logIndex);
    builder.writeCell(source.merkleProof);
    builder.writeCell(source.messageData);
    return builder.build();
}

export function dictValueParserVerifyEthereumMessage(): DictionaryValue<VerifyEthereumMessage> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVerifyEthereumMessage(src)).endCell());
        },
        parse: (src) => {
            return loadVerifyEthereumMessage(src.loadRef().beginParse());
        }
    }
}

export type MessageRelayed = {
    $$type: 'MessageRelayed';
    messageId: bigint;
    sourceChain: string;
    sourceAddress: string;
    destAddress: Address;
    amount: bigint;
    relayer: Address;
}

export function storeMessageRelayed(src: MessageRelayed) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3651838794, 32);
        b_0.storeInt(src.messageId, 257);
        b_0.storeStringRefTail(src.sourceChain);
        b_0.storeStringRefTail(src.sourceAddress);
        b_0.storeAddress(src.destAddress);
        b_0.storeInt(src.amount, 257);
        const b_1 = new Builder();
        b_1.storeAddress(src.relayer);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadMessageRelayed(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3651838794) { throw Error('Invalid prefix'); }
    const _messageId = sc_0.loadIntBig(257);
    const _sourceChain = sc_0.loadStringRefTail();
    const _sourceAddress = sc_0.loadStringRefTail();
    const _destAddress = sc_0.loadAddress();
    const _amount = sc_0.loadIntBig(257);
    const sc_1 = sc_0.loadRef().beginParse();
    const _relayer = sc_1.loadAddress();
    return { $$type: 'MessageRelayed' as const, messageId: _messageId, sourceChain: _sourceChain, sourceAddress: _sourceAddress, destAddress: _destAddress, amount: _amount, relayer: _relayer };
}

export function loadTupleMessageRelayed(source: TupleReader) {
    const _messageId = source.readBigNumber();
    const _sourceChain = source.readString();
    const _sourceAddress = source.readString();
    const _destAddress = source.readAddress();
    const _amount = source.readBigNumber();
    const _relayer = source.readAddress();
    return { $$type: 'MessageRelayed' as const, messageId: _messageId, sourceChain: _sourceChain, sourceAddress: _sourceAddress, destAddress: _destAddress, amount: _amount, relayer: _relayer };
}

export function loadGetterTupleMessageRelayed(source: TupleReader) {
    const _messageId = source.readBigNumber();
    const _sourceChain = source.readString();
    const _sourceAddress = source.readString();
    const _destAddress = source.readAddress();
    const _amount = source.readBigNumber();
    const _relayer = source.readAddress();
    return { $$type: 'MessageRelayed' as const, messageId: _messageId, sourceChain: _sourceChain, sourceAddress: _sourceAddress, destAddress: _destAddress, amount: _amount, relayer: _relayer };
}

export function storeTupleMessageRelayed(source: MessageRelayed) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.messageId);
    builder.writeString(source.sourceChain);
    builder.writeString(source.sourceAddress);
    builder.writeAddress(source.destAddress);
    builder.writeNumber(source.amount);
    builder.writeAddress(source.relayer);
    return builder.build();
}

export function dictValueParserMessageRelayed(): DictionaryValue<MessageRelayed> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageRelayed(src)).endCell());
        },
        parse: (src) => {
            return loadMessageRelayed(src.loadRef().beginParse());
        }
    }
}

export type RelayerAdded = {
    $$type: 'RelayerAdded';
    relayer: Address;
    admin: Address;
}

export function storeRelayerAdded(src: RelayerAdded) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3801713696, 32);
        b_0.storeAddress(src.relayer);
        b_0.storeAddress(src.admin);
    };
}

export function loadRelayerAdded(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3801713696) { throw Error('Invalid prefix'); }
    const _relayer = sc_0.loadAddress();
    const _admin = sc_0.loadAddress();
    return { $$type: 'RelayerAdded' as const, relayer: _relayer, admin: _admin };
}

export function loadTupleRelayerAdded(source: TupleReader) {
    const _relayer = source.readAddress();
    const _admin = source.readAddress();
    return { $$type: 'RelayerAdded' as const, relayer: _relayer, admin: _admin };
}

export function loadGetterTupleRelayerAdded(source: TupleReader) {
    const _relayer = source.readAddress();
    const _admin = source.readAddress();
    return { $$type: 'RelayerAdded' as const, relayer: _relayer, admin: _admin };
}

export function storeTupleRelayerAdded(source: RelayerAdded) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.relayer);
    builder.writeAddress(source.admin);
    return builder.build();
}

export function dictValueParserRelayerAdded(): DictionaryValue<RelayerAdded> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRelayerAdded(src)).endCell());
        },
        parse: (src) => {
            return loadRelayerAdded(src.loadRef().beginParse());
        }
    }
}

export type RelayerRemoved = {
    $$type: 'RelayerRemoved';
    relayer: Address;
    admin: Address;
}

export function storeRelayerRemoved(src: RelayerRemoved) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(4073636892, 32);
        b_0.storeAddress(src.relayer);
        b_0.storeAddress(src.admin);
    };
}

export function loadRelayerRemoved(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 4073636892) { throw Error('Invalid prefix'); }
    const _relayer = sc_0.loadAddress();
    const _admin = sc_0.loadAddress();
    return { $$type: 'RelayerRemoved' as const, relayer: _relayer, admin: _admin };
}

export function loadTupleRelayerRemoved(source: TupleReader) {
    const _relayer = source.readAddress();
    const _admin = source.readAddress();
    return { $$type: 'RelayerRemoved' as const, relayer: _relayer, admin: _admin };
}

export function loadGetterTupleRelayerRemoved(source: TupleReader) {
    const _relayer = source.readAddress();
    const _admin = source.readAddress();
    return { $$type: 'RelayerRemoved' as const, relayer: _relayer, admin: _admin };
}

export function storeTupleRelayerRemoved(source: RelayerRemoved) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.relayer);
    builder.writeAddress(source.admin);
    return builder.build();
}

export function dictValueParserRelayerRemoved(): DictionaryValue<RelayerRemoved> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRelayerRemoved(src)).endCell());
        },
        parse: (src) => {
            return loadRelayerRemoved(src.loadRef().beginParse());
        }
    }
}

export type MessageConfirmationKey = {
    $$type: 'MessageConfirmationKey';
    messageId: bigint;
    relayer: Address;
}

export function storeMessageConfirmationKey(src: MessageConfirmationKey) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.messageId, 257);
        b_0.storeAddress(src.relayer);
    };
}

export function loadMessageConfirmationKey(slice: Slice) {
    const sc_0 = slice;
    const _messageId = sc_0.loadIntBig(257);
    const _relayer = sc_0.loadAddress();
    return { $$type: 'MessageConfirmationKey' as const, messageId: _messageId, relayer: _relayer };
}

export function loadTupleMessageConfirmationKey(source: TupleReader) {
    const _messageId = source.readBigNumber();
    const _relayer = source.readAddress();
    return { $$type: 'MessageConfirmationKey' as const, messageId: _messageId, relayer: _relayer };
}

export function loadGetterTupleMessageConfirmationKey(source: TupleReader) {
    const _messageId = source.readBigNumber();
    const _relayer = source.readAddress();
    return { $$type: 'MessageConfirmationKey' as const, messageId: _messageId, relayer: _relayer };
}

export function storeTupleMessageConfirmationKey(source: MessageConfirmationKey) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.messageId);
    builder.writeAddress(source.relayer);
    return builder.build();
}

export function dictValueParserMessageConfirmationKey(): DictionaryValue<MessageConfirmationKey> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageConfirmationKey(src)).endCell());
        },
        parse: (src) => {
            return loadMessageConfirmationKey(src.loadRef().beginParse());
        }
    }
}

export type TonBridge$Data = {
    $$type: 'TonBridge$Data';
    admin: Address;
    relayerCount: bigint;
    relayers: Dictionary<Address, boolean>;
    processedMessages: Dictionary<bigint, boolean>;
    messageConfirmations: Dictionary<bigint, bigint>;
    relayerMessageConfirmations: Dictionary<bigint, boolean>;
}

export function storeTonBridge$Data(src: TonBridge$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.admin);
        b_0.storeInt(src.relayerCount, 257);
        b_0.storeDict(src.relayers, Dictionary.Keys.Address(), Dictionary.Values.Bool());
        b_0.storeDict(src.processedMessages, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool());
        const b_1 = new Builder();
        b_1.storeDict(src.messageConfirmations, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        b_1.storeDict(src.relayerMessageConfirmations, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTonBridge$Data(slice: Slice) {
    const sc_0 = slice;
    const _admin = sc_0.loadAddress();
    const _relayerCount = sc_0.loadIntBig(257);
    const _relayers = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.Bool(), sc_0);
    const _processedMessages = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), sc_0);
    const sc_1 = sc_0.loadRef().beginParse();
    const _messageConfirmations = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_1);
    const _relayerMessageConfirmations = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), sc_1);
    return { $$type: 'TonBridge$Data' as const, admin: _admin, relayerCount: _relayerCount, relayers: _relayers, processedMessages: _processedMessages, messageConfirmations: _messageConfirmations, relayerMessageConfirmations: _relayerMessageConfirmations };
}

export function loadTupleTonBridge$Data(source: TupleReader) {
    const _admin = source.readAddress();
    const _relayerCount = source.readBigNumber();
    const _relayers = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    const _processedMessages = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    const _messageConfirmations = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _relayerMessageConfirmations = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    return { $$type: 'TonBridge$Data' as const, admin: _admin, relayerCount: _relayerCount, relayers: _relayers, processedMessages: _processedMessages, messageConfirmations: _messageConfirmations, relayerMessageConfirmations: _relayerMessageConfirmations };
}

export function loadGetterTupleTonBridge$Data(source: TupleReader) {
    const _admin = source.readAddress();
    const _relayerCount = source.readBigNumber();
    const _relayers = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    const _processedMessages = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    const _messageConfirmations = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _relayerMessageConfirmations = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    return { $$type: 'TonBridge$Data' as const, admin: _admin, relayerCount: _relayerCount, relayers: _relayers, processedMessages: _processedMessages, messageConfirmations: _messageConfirmations, relayerMessageConfirmations: _relayerMessageConfirmations };
}

export function storeTupleTonBridge$Data(source: TonBridge$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.admin);
    builder.writeNumber(source.relayerCount);
    builder.writeCell(source.relayers.size > 0 ? beginCell().storeDictDirect(source.relayers, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.processedMessages.size > 0 ? beginCell().storeDictDirect(source.processedMessages, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.messageConfirmations.size > 0 ? beginCell().storeDictDirect(source.messageConfirmations, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.relayerMessageConfirmations.size > 0 ? beginCell().storeDictDirect(source.relayerMessageConfirmations, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()).endCell() : null);
    return builder.build();
}

export function dictValueParserTonBridge$Data(): DictionaryValue<TonBridge$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTonBridge$Data(src)).endCell());
        },
        parse: (src) => {
            return loadTonBridge$Data(src.loadRef().beginParse());
        }
    }
}

export type BridgeInfo = {
    $$type: 'BridgeInfo';
    admin: Address;
    relayerCount: bigint;
    requiredConfirmations: bigint;
}

export function storeBridgeInfo(src: BridgeInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.admin);
        b_0.storeInt(src.relayerCount, 257);
        b_0.storeInt(src.requiredConfirmations, 257);
    };
}

export function loadBridgeInfo(slice: Slice) {
    const sc_0 = slice;
    const _admin = sc_0.loadAddress();
    const _relayerCount = sc_0.loadIntBig(257);
    const _requiredConfirmations = sc_0.loadIntBig(257);
    return { $$type: 'BridgeInfo' as const, admin: _admin, relayerCount: _relayerCount, requiredConfirmations: _requiredConfirmations };
}

export function loadTupleBridgeInfo(source: TupleReader) {
    const _admin = source.readAddress();
    const _relayerCount = source.readBigNumber();
    const _requiredConfirmations = source.readBigNumber();
    return { $$type: 'BridgeInfo' as const, admin: _admin, relayerCount: _relayerCount, requiredConfirmations: _requiredConfirmations };
}

export function loadGetterTupleBridgeInfo(source: TupleReader) {
    const _admin = source.readAddress();
    const _relayerCount = source.readBigNumber();
    const _requiredConfirmations = source.readBigNumber();
    return { $$type: 'BridgeInfo' as const, admin: _admin, relayerCount: _relayerCount, requiredConfirmations: _requiredConfirmations };
}

export function storeTupleBridgeInfo(source: BridgeInfo) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.admin);
    builder.writeNumber(source.relayerCount);
    builder.writeNumber(source.requiredConfirmations);
    return builder.build();
}

export function dictValueParserBridgeInfo(): DictionaryValue<BridgeInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBridgeInfo(src)).endCell());
        },
        parse: (src) => {
            return loadBridgeInfo(src.loadRef().beginParse());
        }
    }
}

 type TonBridge_init_args = {
    $$type: 'TonBridge_init_args';
    admin: Address;
}

function initTonBridge_init_args(src: TonBridge_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.admin);
    };
}

async function TonBridge_init(admin: Address) {
    const __code = Cell.fromHex('b5ee9c724102260100073f00022cff008e88f4a413f4bcf2c80bed53208e8130e1ed43d90118020271020d020120030b02014804090201200507016facf9f6a268690000c70dfd20408080eb807a026a00e87a027a027a0218081b081a881a360b4e7d200080e8b6b6b6b6b82a98716d9e3631c0060006535472016faf6d76a268690000c70dfd20408080eb807a026a00e87a027a027a0218081b081a881a360b4e7d200080e8b6b6b6b6b82a98716d9e3630c008000225016fb161fb51343480006386fe9020404075c03d013500743d013d013d010c040d840d440d1b05a73e900040745b5b5b5b5c154c38b6cf1b18600a000224016fb8e14ed44d0d200018e1bfa40810101d700f404d401d0f404f404f404301036103510346c169cfa400101d16d6d6d6d705530e2db3c6c6180c0002720201200e100173b85efed44d0d200018e1bfa40810101d700f404d401d0f404f404f404301036103510346c169cfa400101d16d6d6d6d705530e25505db3c6c6180f003c81010b2502714133f40a6fa19401d70030925b6de27f216e925b7091bae2020148111602012012140173af8076a268690000c70dfd20408080eb807a026a00e87a027a027a0218081b081a881a360b4e7d200080e8b6b6b6b6b82a98712a82ed9e3630c013007281010154530052304133f40c6fa19401d70030925b6de26eb38e1b810101530350334133f40c6fa19401d70030925b6de2206ef2d080e030700173adf676a268690000c70dfd20408080eb807a026a00e87a027a027a0218081b081a881a360b4e7d200080e8b6b6b6b6b82a98712a8aed9e3630c0150140db3c8101012202714133f40c6fa19401d70030925b6de27f216e925b7091bae21e0173b3d6fb51343480006386fe9020404075c03d013500743d013d013d010c040d840d440d1b05a73e900040745b5b5b5b5c154c38954176cf1b186017003c8101012402714133f40c6fa19401d70030925b6de27f216e925b7091bae204f401d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e1bfa40810101d700f404d401d0f404f404f404301036103510346c169cfa400101d16d6d6d6d705530e207925f07e005d70d1ff2e082218210c9631faebae302218210db38cb25bae302218210b5b0237bbae30221821089c65d1fba191b1d2301fe31fa4030813addf84226c705f2f48200bbe924c10af2f48200ce982381010b23714133f40a6fa19401d70030925b6de27f216e925b7f91bde2f2f40281010b237f71216e955b59f4593098c801cf004133f441e203a45124c8598210e2998c205003cb1fcecec9c88258c000000000000000000000000101cb67ccc970fb001a004810354043c87f01ca0055505056ce13810101cf00f40001c8f40012f40012f400cdc9ed5401f431fa4030816ddbf84226c705f2f48200ec5e2381010b23714133f40a6fa19401d70030925b6de27f216e925b7091bae2f2f40281010b237071216e955b59f4593098c801cf004133f441e203a55124c8598210f2cec41c5003cb1fcecec9c88258c000000000000000000000000101cb67ccc970fb00103540431c0040c87f01ca0055505056ce13810101cf00f40001c8f40012f40012f400cdc9ed5402fc31810101d700d401d001d401d001fa40810101d700d430d0810101d700810101d700d4308200be5381010bf8422c59714133f40a6fa19401d70030925b6de27f216e925b7091bae2f2f48200e2c8298101012a714133f40c6fa19401d70030925b6de27f216e925b7f91bde2f2f4f842106c105b104a10394de05280db3c1e1f0028f9010182103b9aca00a80182103b9aca00a908a001fa8200f4942281010123714133f40c6fa19401d70030925b6de27f216e925b7f91bde2f2f4810101017f71216e955b59f45a3098c801cf004133f442e27081010154530052b04133f40c6fa19401d70030925b6de26eb38e1d3081010154520052a04133f40c6fa19401d70030925b6de2206ef2d080dea4810101541300200182546a50216e955b59f45a3098c801cf004133f442e202c201943c3c6c64e30d5513c87f01ca0055505056ce13810101cf00f40001c8f40012f40012f400cdc9ed542101dc02810101287f71216e955b59f45a3098c801cf004133f442e2f842546880546ee052e0c855508210d9aaa34a5007cb1f15810101cf0003c8ce13cd01c8cecdce810101cf0001c8cecdc9c88258c000000000000000000000000101cb67ccc970fb00105b104a103948cddb3c04052200045f0802ea8ee331d401d001810101d700810101d700d4308200be5381010bf8422859714133f40a6fa19401d70030925b6de27f216e925b7091bae2f2f4db3c81738e01f2f410355512c87f01ca0055505056ce13810101cf00f40001c8f40012f40012f400cdc9ed54e0018210946a98b6bae3025f07f2c0822425000c10235f03c20000b6d33f30c8018210aff90f5758cb1fcb3fc910461035443012f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055505056ce13810101cf00f40001c8f40012f40012f400cdc9ed543371d1be');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initTonBridge_init_args({ $$type: 'TonBridge_init_args', admin })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const TonBridge_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    15069: { message: "Only admin can add relayers" },
    28123: { message: "Only admin can remove relayers" },
    29582: { message: "Invalid Ethereum proof" },
    48105: { message: "Too many relayers" },
    48723: { message: "Unauthorized relayer" },
    52888: { message: "Relayer already exists" },
    58056: { message: "Message already processed" },
    60510: { message: "Relayer does not exist" },
    62612: { message: "Relayer already confirmed this message" },
} as const

export const TonBridge_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Only admin can add relayers": 15069,
    "Only admin can remove relayers": 28123,
    "Invalid Ethereum proof": 29582,
    "Too many relayers": 48105,
    "Unauthorized relayer": 48723,
    "Relayer already exists": 52888,
    "Message already processed": 58056,
    "Relayer does not exist": 60510,
    "Relayer already confirmed this message": 62612,
} as const

const TonBridge_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AddRelayer","header":3378716590,"fields":[{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"RemoveRelayer","header":3677932325,"fields":[{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"RelayMessage","header":3048219515,"fields":[{"name":"messageId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"sourceChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"sourceAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"destAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"proof","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"VerifyEthereumMessage","header":2311478559,"fields":[{"name":"txHash","type":{"kind":"simple","type":"string","optional":false}},{"name":"blockNumber","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"logIndex","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"merkleProof","type":{"kind":"simple","type":"cell","optional":false}},{"name":"messageData","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"MessageRelayed","header":3651838794,"fields":[{"name":"messageId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"sourceChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"sourceAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"destAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"RelayerAdded","header":3801713696,"fields":[{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}},{"name":"admin","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"RelayerRemoved","header":4073636892,"fields":[{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}},{"name":"admin","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"MessageConfirmationKey","header":null,"fields":[{"name":"messageId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"TonBridge$Data","header":null,"fields":[{"name":"admin","type":{"kind":"simple","type":"address","optional":false}},{"name":"relayerCount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"relayers","type":{"kind":"dict","key":"address","value":"bool"}},{"name":"processedMessages","type":{"kind":"dict","key":"int","value":"bool"}},{"name":"messageConfirmations","type":{"kind":"dict","key":"int","value":"int"}},{"name":"relayerMessageConfirmations","type":{"kind":"dict","key":"int","value":"bool"}}]},
    {"name":"BridgeInfo","header":null,"fields":[{"name":"admin","type":{"kind":"simple","type":"address","optional":false}},{"name":"relayerCount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"requiredConfirmations","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
]

const TonBridge_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "AddRelayer": 3378716590,
    "RemoveRelayer": 3677932325,
    "RelayMessage": 3048219515,
    "VerifyEthereumMessage": 2311478559,
    "MessageRelayed": 3651838794,
    "RelayerAdded": 3801713696,
    "RelayerRemoved": 4073636892,
}

const TonBridge_getters: ABIGetter[] = [
    {"name":"isRelayer","methodId":99823,"arguments":[{"name":"address","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"getRelayerCount","methodId":71047,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"isMessageProcessed","methodId":122715,"arguments":[{"name":"messageId","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"getMessageConfirmations","methodId":116480,"arguments":[{"name":"messageId","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getRequiredConfirmations","methodId":85524,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getAdmin","methodId":69338,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"hasRelayerConfirmed","methodId":117740,"arguments":[{"name":"messageId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"relayer","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"getBridgeInfo","methodId":66035,"arguments":[],"returnType":{"kind":"simple","type":"BridgeInfo","optional":false}},
]

export const TonBridge_getterMapping: { [key: string]: string } = {
    'isRelayer': 'getIsRelayer',
    'getRelayerCount': 'getGetRelayerCount',
    'isMessageProcessed': 'getIsMessageProcessed',
    'getMessageConfirmations': 'getGetMessageConfirmations',
    'getRequiredConfirmations': 'getGetRequiredConfirmations',
    'getAdmin': 'getGetAdmin',
    'hasRelayerConfirmed': 'getHasRelayerConfirmed',
    'getBridgeInfo': 'getGetBridgeInfo',
}

const TonBridge_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"AddRelayer"}},
    {"receiver":"internal","message":{"kind":"typed","type":"RemoveRelayer"}},
    {"receiver":"internal","message":{"kind":"typed","type":"RelayMessage"}},
    {"receiver":"internal","message":{"kind":"typed","type":"VerifyEthereumMessage"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class TonBridge implements Contract {
    
    public static readonly MAX_RELAYERS = 10n;
    public static readonly REQUIRED_CONFIRMATIONS = 2n;
    public static readonly storageReserve = 0n;
    public static readonly errors = TonBridge_errors_backward;
    public static readonly opcodes = TonBridge_opcodes;
    
    static async init(admin: Address) {
        return await TonBridge_init(admin);
    }
    
    static async fromInit(admin: Address) {
        const __gen_init = await TonBridge_init(admin);
        const address = contractAddress(0, __gen_init);
        return new TonBridge(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new TonBridge(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  TonBridge_types,
        getters: TonBridge_getters,
        receivers: TonBridge_receivers,
        errors: TonBridge_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: AddRelayer | RemoveRelayer | RelayMessage | VerifyEthereumMessage | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AddRelayer') {
            body = beginCell().store(storeAddRelayer(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'RemoveRelayer') {
            body = beginCell().store(storeRemoveRelayer(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'RelayMessage') {
            body = beginCell().store(storeRelayMessage(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'VerifyEthereumMessage') {
            body = beginCell().store(storeVerifyEthereumMessage(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getIsRelayer(provider: ContractProvider, address: Address) {
        const builder = new TupleBuilder();
        builder.writeAddress(address);
        const source = (await provider.get('isRelayer', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getGetRelayerCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getRelayerCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getIsMessageProcessed(provider: ContractProvider, messageId: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(messageId);
        const source = (await provider.get('isMessageProcessed', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getGetMessageConfirmations(provider: ContractProvider, messageId: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(messageId);
        const source = (await provider.get('getMessageConfirmations', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getGetRequiredConfirmations(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getRequiredConfirmations', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getGetAdmin(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getAdmin', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
    async getHasRelayerConfirmed(provider: ContractProvider, messageId: bigint, relayer: Address) {
        const builder = new TupleBuilder();
        builder.writeNumber(messageId);
        builder.writeAddress(relayer);
        const source = (await provider.get('hasRelayerConfirmed', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getGetBridgeInfo(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getBridgeInfo', builder.build())).stack;
        const result = loadGetterTupleBridgeInfo(source);
        return result;
    }
    
}