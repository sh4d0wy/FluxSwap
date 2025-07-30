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

export type CreateEscrow = {
    $$type: 'CreateEscrow';
    recipient: Address;
    amount: bigint;
    hashlock: bigint;
    timelock: bigint;
}

export function storeCreateEscrow(src: CreateEscrow) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3508744068, 32);
        b_0.storeAddress(src.recipient);
        b_0.storeInt(src.amount, 257);
        b_0.storeInt(src.hashlock, 257);
        const b_1 = new Builder();
        b_1.storeInt(src.timelock, 257);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadCreateEscrow(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3508744068) { throw Error('Invalid prefix'); }
    const _recipient = sc_0.loadAddress();
    const _amount = sc_0.loadIntBig(257);
    const _hashlock = sc_0.loadIntBig(257);
    const sc_1 = sc_0.loadRef().beginParse();
    const _timelock = sc_1.loadIntBig(257);
    return { $$type: 'CreateEscrow' as const, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock };
}

export function loadTupleCreateEscrow(source: TupleReader) {
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    return { $$type: 'CreateEscrow' as const, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock };
}

export function loadGetterTupleCreateEscrow(source: TupleReader) {
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    return { $$type: 'CreateEscrow' as const, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock };
}

export function storeTupleCreateEscrow(source: CreateEscrow) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.recipient);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    return builder.build();
}

export function dictValueParserCreateEscrow(): DictionaryValue<CreateEscrow> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCreateEscrow(src)).endCell());
        },
        parse: (src) => {
            return loadCreateEscrow(src.loadRef().beginParse());
        }
    }
}

export type FulfillEscrow = {
    $$type: 'FulfillEscrow';
    secret: string;
}

export function storeFulfillEscrow(src: FulfillEscrow) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(592135612, 32);
        b_0.storeStringRefTail(src.secret);
    };
}

export function loadFulfillEscrow(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 592135612) { throw Error('Invalid prefix'); }
    const _secret = sc_0.loadStringRefTail();
    return { $$type: 'FulfillEscrow' as const, secret: _secret };
}

export function loadTupleFulfillEscrow(source: TupleReader) {
    const _secret = source.readString();
    return { $$type: 'FulfillEscrow' as const, secret: _secret };
}

export function loadGetterTupleFulfillEscrow(source: TupleReader) {
    const _secret = source.readString();
    return { $$type: 'FulfillEscrow' as const, secret: _secret };
}

export function storeTupleFulfillEscrow(source: FulfillEscrow) {
    const builder = new TupleBuilder();
    builder.writeString(source.secret);
    return builder.build();
}

export function dictValueParserFulfillEscrow(): DictionaryValue<FulfillEscrow> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFulfillEscrow(src)).endCell());
        },
        parse: (src) => {
            return loadFulfillEscrow(src.loadRef().beginParse());
        }
    }
}

export type RefundEscrow = {
    $$type: 'RefundEscrow';
}

export function storeRefundEscrow(src: RefundEscrow) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2398872418, 32);
    };
}

export function loadRefundEscrow(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2398872418) { throw Error('Invalid prefix'); }
    return { $$type: 'RefundEscrow' as const };
}

export function loadTupleRefundEscrow(source: TupleReader) {
    return { $$type: 'RefundEscrow' as const };
}

export function loadGetterTupleRefundEscrow(source: TupleReader) {
    return { $$type: 'RefundEscrow' as const };
}

export function storeTupleRefundEscrow(source: RefundEscrow) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserRefundEscrow(): DictionaryValue<RefundEscrow> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRefundEscrow(src)).endCell());
        },
        parse: (src) => {
            return loadRefundEscrow(src.loadRef().beginParse());
        }
    }
}

export type EscrowCreated = {
    $$type: 'EscrowCreated';
    escrowId: bigint;
    sender: Address;
    recipient: Address;
    amount: bigint;
    hashlock: bigint;
    timelock: bigint;
}

export function storeEscrowCreated(src: EscrowCreated) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(842492385, 32);
        b_0.storeInt(src.escrowId, 257);
        b_0.storeAddress(src.sender);
        b_0.storeAddress(src.recipient);
        const b_1 = new Builder();
        b_1.storeInt(src.amount, 257);
        b_1.storeInt(src.hashlock, 257);
        b_1.storeInt(src.timelock, 257);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadEscrowCreated(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 842492385) { throw Error('Invalid prefix'); }
    const _escrowId = sc_0.loadIntBig(257);
    const _sender = sc_0.loadAddress();
    const _recipient = sc_0.loadAddress();
    const sc_1 = sc_0.loadRef().beginParse();
    const _amount = sc_1.loadIntBig(257);
    const _hashlock = sc_1.loadIntBig(257);
    const _timelock = sc_1.loadIntBig(257);
    return { $$type: 'EscrowCreated' as const, escrowId: _escrowId, sender: _sender, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock };
}

export function loadTupleEscrowCreated(source: TupleReader) {
    const _escrowId = source.readBigNumber();
    const _sender = source.readAddress();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    return { $$type: 'EscrowCreated' as const, escrowId: _escrowId, sender: _sender, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock };
}

export function loadGetterTupleEscrowCreated(source: TupleReader) {
    const _escrowId = source.readBigNumber();
    const _sender = source.readAddress();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    return { $$type: 'EscrowCreated' as const, escrowId: _escrowId, sender: _sender, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock };
}

export function storeTupleEscrowCreated(source: EscrowCreated) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.escrowId);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.recipient);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    return builder.build();
}

export function dictValueParserEscrowCreated(): DictionaryValue<EscrowCreated> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrowCreated(src)).endCell());
        },
        parse: (src) => {
            return loadEscrowCreated(src.loadRef().beginParse());
        }
    }
}

export type EscrowFulfilled = {
    $$type: 'EscrowFulfilled';
    escrowId: bigint;
    secret: string;
    fulfiller: Address;
}

export function storeEscrowFulfilled(src: EscrowFulfilled) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3055951833, 32);
        b_0.storeInt(src.escrowId, 257);
        b_0.storeStringRefTail(src.secret);
        b_0.storeAddress(src.fulfiller);
    };
}

export function loadEscrowFulfilled(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3055951833) { throw Error('Invalid prefix'); }
    const _escrowId = sc_0.loadIntBig(257);
    const _secret = sc_0.loadStringRefTail();
    const _fulfiller = sc_0.loadAddress();
    return { $$type: 'EscrowFulfilled' as const, escrowId: _escrowId, secret: _secret, fulfiller: _fulfiller };
}

export function loadTupleEscrowFulfilled(source: TupleReader) {
    const _escrowId = source.readBigNumber();
    const _secret = source.readString();
    const _fulfiller = source.readAddress();
    return { $$type: 'EscrowFulfilled' as const, escrowId: _escrowId, secret: _secret, fulfiller: _fulfiller };
}

export function loadGetterTupleEscrowFulfilled(source: TupleReader) {
    const _escrowId = source.readBigNumber();
    const _secret = source.readString();
    const _fulfiller = source.readAddress();
    return { $$type: 'EscrowFulfilled' as const, escrowId: _escrowId, secret: _secret, fulfiller: _fulfiller };
}

export function storeTupleEscrowFulfilled(source: EscrowFulfilled) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.escrowId);
    builder.writeString(source.secret);
    builder.writeAddress(source.fulfiller);
    return builder.build();
}

export function dictValueParserEscrowFulfilled(): DictionaryValue<EscrowFulfilled> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrowFulfilled(src)).endCell());
        },
        parse: (src) => {
            return loadEscrowFulfilled(src.loadRef().beginParse());
        }
    }
}

export type EscrowRefunded = {
    $$type: 'EscrowRefunded';
    escrowId: bigint;
    refunder: Address;
}

export function storeEscrowRefunded(src: EscrowRefunded) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3557648066, 32);
        b_0.storeInt(src.escrowId, 257);
        b_0.storeAddress(src.refunder);
    };
}

export function loadEscrowRefunded(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3557648066) { throw Error('Invalid prefix'); }
    const _escrowId = sc_0.loadIntBig(257);
    const _refunder = sc_0.loadAddress();
    return { $$type: 'EscrowRefunded' as const, escrowId: _escrowId, refunder: _refunder };
}

export function loadTupleEscrowRefunded(source: TupleReader) {
    const _escrowId = source.readBigNumber();
    const _refunder = source.readAddress();
    return { $$type: 'EscrowRefunded' as const, escrowId: _escrowId, refunder: _refunder };
}

export function loadGetterTupleEscrowRefunded(source: TupleReader) {
    const _escrowId = source.readBigNumber();
    const _refunder = source.readAddress();
    return { $$type: 'EscrowRefunded' as const, escrowId: _escrowId, refunder: _refunder };
}

export function storeTupleEscrowRefunded(source: EscrowRefunded) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.escrowId);
    builder.writeAddress(source.refunder);
    return builder.build();
}

export function dictValueParserEscrowRefunded(): DictionaryValue<EscrowRefunded> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrowRefunded(src)).endCell());
        },
        parse: (src) => {
            return loadEscrowRefunded(src.loadRef().beginParse());
        }
    }
}

export type TonEscrow$Data = {
    $$type: 'TonEscrow$Data';
    owner: Address;
    recipient: Address;
    amount: bigint;
    hashlock: bigint;
    timelock: bigint;
    status: bigint;
    secret: string;
    escrowId: bigint;
}

export function storeTonEscrow$Data(src: TonEscrow$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.recipient);
        b_0.storeInt(src.amount, 257);
        const b_1 = new Builder();
        b_1.storeInt(src.hashlock, 257);
        b_1.storeInt(src.timelock, 257);
        b_1.storeInt(src.status, 257);
        b_1.storeStringRefTail(src.secret);
        const b_2 = new Builder();
        b_2.storeInt(src.escrowId, 257);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTonEscrow$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _recipient = sc_0.loadAddress();
    const _amount = sc_0.loadIntBig(257);
    const sc_1 = sc_0.loadRef().beginParse();
    const _hashlock = sc_1.loadIntBig(257);
    const _timelock = sc_1.loadIntBig(257);
    const _status = sc_1.loadIntBig(257);
    const _secret = sc_1.loadStringRefTail();
    const sc_2 = sc_1.loadRef().beginParse();
    const _escrowId = sc_2.loadIntBig(257);
    return { $$type: 'TonEscrow$Data' as const, owner: _owner, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock, status: _status, secret: _secret, escrowId: _escrowId };
}

export function loadTupleTonEscrow$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    const _status = source.readBigNumber();
    const _secret = source.readString();
    const _escrowId = source.readBigNumber();
    return { $$type: 'TonEscrow$Data' as const, owner: _owner, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock, status: _status, secret: _secret, escrowId: _escrowId };
}

export function loadGetterTupleTonEscrow$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    const _status = source.readBigNumber();
    const _secret = source.readString();
    const _escrowId = source.readBigNumber();
    return { $$type: 'TonEscrow$Data' as const, owner: _owner, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock, status: _status, secret: _secret, escrowId: _escrowId };
}

export function storeTupleTonEscrow$Data(source: TonEscrow$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeAddress(source.recipient);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    builder.writeNumber(source.status);
    builder.writeString(source.secret);
    builder.writeNumber(source.escrowId);
    return builder.build();
}

export function dictValueParserTonEscrow$Data(): DictionaryValue<TonEscrow$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTonEscrow$Data(src)).endCell());
        },
        parse: (src) => {
            return loadTonEscrow$Data(src.loadRef().beginParse());
        }
    }
}

export type EscrowInfo = {
    $$type: 'EscrowInfo';
    owner: Address;
    recipient: Address;
    amount: bigint;
    hashlock: bigint;
    timelock: bigint;
    status: bigint;
    secret: string;
    escrowId: bigint;
}

export function storeEscrowInfo(src: EscrowInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.recipient);
        b_0.storeInt(src.amount, 257);
        const b_1 = new Builder();
        b_1.storeInt(src.hashlock, 257);
        b_1.storeInt(src.timelock, 257);
        b_1.storeInt(src.status, 257);
        b_1.storeStringRefTail(src.secret);
        const b_2 = new Builder();
        b_2.storeInt(src.escrowId, 257);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadEscrowInfo(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _recipient = sc_0.loadAddress();
    const _amount = sc_0.loadIntBig(257);
    const sc_1 = sc_0.loadRef().beginParse();
    const _hashlock = sc_1.loadIntBig(257);
    const _timelock = sc_1.loadIntBig(257);
    const _status = sc_1.loadIntBig(257);
    const _secret = sc_1.loadStringRefTail();
    const sc_2 = sc_1.loadRef().beginParse();
    const _escrowId = sc_2.loadIntBig(257);
    return { $$type: 'EscrowInfo' as const, owner: _owner, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock, status: _status, secret: _secret, escrowId: _escrowId };
}

export function loadTupleEscrowInfo(source: TupleReader) {
    const _owner = source.readAddress();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    const _status = source.readBigNumber();
    const _secret = source.readString();
    const _escrowId = source.readBigNumber();
    return { $$type: 'EscrowInfo' as const, owner: _owner, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock, status: _status, secret: _secret, escrowId: _escrowId };
}

export function loadGetterTupleEscrowInfo(source: TupleReader) {
    const _owner = source.readAddress();
    const _recipient = source.readAddress();
    const _amount = source.readBigNumber();
    const _hashlock = source.readBigNumber();
    const _timelock = source.readBigNumber();
    const _status = source.readBigNumber();
    const _secret = source.readString();
    const _escrowId = source.readBigNumber();
    return { $$type: 'EscrowInfo' as const, owner: _owner, recipient: _recipient, amount: _amount, hashlock: _hashlock, timelock: _timelock, status: _status, secret: _secret, escrowId: _escrowId };
}

export function storeTupleEscrowInfo(source: EscrowInfo) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeAddress(source.recipient);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    builder.writeNumber(source.status);
    builder.writeString(source.secret);
    builder.writeNumber(source.escrowId);
    return builder.build();
}

export function dictValueParserEscrowInfo(): DictionaryValue<EscrowInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrowInfo(src)).endCell());
        },
        parse: (src) => {
            return loadEscrowInfo(src.loadRef().beginParse());
        }
    }
}

 type TonEscrow_init_args = {
    $$type: 'TonEscrow_init_args';
    owner: Address;
    recipient: Address;
    amount: bigint;
    hashlock: bigint;
    timelock: bigint;
    escrowId: bigint;
}

function initTonEscrow_init_args(src: TonEscrow_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.recipient);
        b_0.storeInt(src.amount, 257);
        const b_1 = new Builder();
        b_1.storeInt(src.hashlock, 257);
        b_1.storeInt(src.timelock, 257);
        b_1.storeInt(src.escrowId, 257);
        b_0.storeRef(b_1.endCell());
    };
}

async function TonEscrow_init(owner: Address, recipient: Address, amount: bigint, hashlock: bigint, timelock: bigint, escrowId: bigint) {
    const __code = Cell.fromHex('b5ee9c7241021e0100067f000228ff008e88f4a413f4bcf2c80bed5320e303ed43d90112020271020a020120030502d3b9673ed44d0d200018e30fa40fa40810101d700d401d0810101d700810101d700810101d700d401d001d430d0810101d700301058105710566c188ea8fa40fa40810101d700d401d0810101d700810101d700810101d7003010361035103406d15504db3ce2db3c6c8181304001622c00094f82324be9170e2020276060802d2a92ded44d0d200018e30fa40fa40810101d700d401d0810101d700810101d700810101d700d401d001d430d0810101d700301058105710566c188ea8fa40fa40810101d700d401d0810101d700810101d700810101d7003010361035103406d15504db3ce2db3c6c81130700022202d2aba3ed44d0d200018e30fa40fa40810101d700d401d0810101d700810101d700810101d700d401d001d430d0810101d700301058105710566c188ea8fa40fa40810101d700d401d0810101d700810101d700810101d7003010361035103406d15504db3ce2db3c6c8113090008f82324be0201200b100201200c0e02d3b5411da89a1a400031c61f481f481020203ae01a803a1020203ae01020203ae01020203ae01a803a003a861a1020203ae006020b020ae20acd8311d51f481f481020203ae01a803a1020203ae01020203ae01020203ae0060206c206a20680da2aa09b679c5b678d9030130d001622c00094f82324b99170e202d3b7927da89a1a400031c61f481f481020203ae01a803a1020203ae01020203ae01020203ae01a803a003a861a1020203ae006020b020ae20acd8311d51f481f481020203ae01a803a1020203ae01020203ae01020203ae0060206c206a20680da2aa09b679c5b678d9110130f0010547765547765537602d3bb37aed44d0d200018e30fa40fa40810101d700d401d0810101d700810101d700810101d700d401d001d430d0810101d700301058105710566c188ea8fa40fa40810101d700d401d0810101d700810101d700810101d7003010361035103406d15504db3ce2db3c6c818131100022102f83001d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e30fa40fa40810101d700d401d0810101d700810101d700810101d700d401d001d430d0810101d700301058105710566c188ea8fa40fa40810101d700d401d0810101d700810101d700810101d7003010361035103406d15504db3ce209131501c8814523f823810e10a05230bcf2f4815804f8238208093a80a05230b9f2f48200eecf24c200f2f48200a3aa23c300f2f4708b08547276547876c855508210323769e15007cb1f15810101cf0013cece01c8810101cf0012810101cf0012810101cf00cdc9140032c88258c000000000000000000000000101cb67ccc970fb0058035c925f09e007d70d1ff2e082218210234b45bcbae3022182108efbe362bae302018210946a98b6bae3025f09f2c08216191d02fe313706d430d081718007c00017f2f48143d5269b9320d74a91d5e868f90400da1123baf2f481572df82322b9f2f42571f842544999c855208210b6261fd95004cb1f12810101cf0001c8cecdcec9c88258c000000000000000000000000101cb67ccc970fb007288265446305a6d6d40037fc8cf8580ca00cf8440ce01fa021718002800000000457363726f772066756c66696c6c656400c48069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001057104610354403c87f01ca0055705078ce15ce13810101cf0001c8810101cf0012810101cf0012810101cf0002c8ce12cd02c8810101cf0012cdcdc9ed5403fc5b81718001c000f2f48115cff82322bef2f48200b902f84226c705f2f472f8425280c8598210d40d66c25003cb1f810101cf00cec9c88258c000000000000000000000000101cb67ccc970fb002088275446305a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2f400c901fb0010571a1b1c002600000000457363726f7720726566756e646564001a58cf8680cf8480f400f400cf8100725514c87f01ca0055705078ce15ce13810101cf0001c8810101cf0012810101cf0012810101cf0002c8ce12cd02c8810101cf0012cdcdc9ed5400ecd33f30c8018210aff90f5758cb1fcb3fc91068105710461035443012f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055705078ce15ce13810101cf0001c8810101cf0012810101cf0012810101cf0002c8ce12cd02c8810101cf0012cdcdc9ed5428c52ff2');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initTonEscrow_init_args({ $$type: 'TonEscrow_init_args', owner, recipient, amount, hashlock, timelock, escrowId })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const TonEscrow_errors = {
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
    5583: { message: "Escrow not expired" },
    17365: { message: "Invalid secret" },
    17699: { message: "Timelock too short" },
    22317: { message: "Escrow expired" },
    22532: { message: "Timelock too long" },
    29056: { message: "Escrow not pending" },
    41898: { message: "Invalid hashlock" },
    47362: { message: "Only owner can refund" },
    61135: { message: "Amount must be positive" },
} as const

export const TonEscrow_errors_backward = {
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
    "Escrow not expired": 5583,
    "Invalid secret": 17365,
    "Timelock too short": 17699,
    "Escrow expired": 22317,
    "Timelock too long": 22532,
    "Escrow not pending": 29056,
    "Invalid hashlock": 41898,
    "Only owner can refund": 47362,
    "Amount must be positive": 61135,
} as const

const TonEscrow_types: ABIType[] = [
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
    {"name":"CreateEscrow","header":3508744068,"fields":[{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"FulfillEscrow","header":592135612,"fields":[{"name":"secret","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"RefundEscrow","header":2398872418,"fields":[]},
    {"name":"EscrowCreated","header":842492385,"fields":[{"name":"escrowId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"EscrowFulfilled","header":3055951833,"fields":[{"name":"escrowId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"string","optional":false}},{"name":"fulfiller","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"EscrowRefunded","header":3557648066,"fields":[{"name":"escrowId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refunder","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"TonEscrow$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"status","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"string","optional":false}},{"name":"escrowId","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"EscrowInfo","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"status","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"string","optional":false}},{"name":"escrowId","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
]

const TonEscrow_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "CreateEscrow": 3508744068,
    "FulfillEscrow": 592135612,
    "RefundEscrow": 2398872418,
    "EscrowCreated": 842492385,
    "EscrowFulfilled": 3055951833,
    "EscrowRefunded": 3557648066,
}

const TonEscrow_getters: ABIGetter[] = [
    {"name":"getEscrowInfo","methodId":113811,"arguments":[],"returnType":{"kind":"simple","type":"EscrowInfo","optional":false}},
    {"name":"getStatus","methodId":94509,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getSecret","methodId":127866,"arguments":[],"returnType":{"kind":"simple","type":"string","optional":false}},
    {"name":"isExpired","methodId":96163,"arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"canFulfill","methodId":100872,"arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"canRefund","methodId":71283,"arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
]

export const TonEscrow_getterMapping: { [key: string]: string } = {
    'getEscrowInfo': 'getGetEscrowInfo',
    'getStatus': 'getGetStatus',
    'getSecret': 'getGetSecret',
    'isExpired': 'getIsExpired',
    'canFulfill': 'getCanFulfill',
    'canRefund': 'getCanRefund',
}

const TonEscrow_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"FulfillEscrow"}},
    {"receiver":"internal","message":{"kind":"typed","type":"RefundEscrow"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class TonEscrow implements Contract {
    
    public static readonly MIN_TIMELOCK = 3600n;
    public static readonly MAX_TIMELOCK = 604800n;
    public static readonly ESCROW_PENDING = 0n;
    public static readonly ESCROW_FULFILLED = 1n;
    public static readonly ESCROW_REFUNDED = 2n;
    public static readonly storageReserve = 0n;
    public static readonly errors = TonEscrow_errors_backward;
    public static readonly opcodes = TonEscrow_opcodes;
    
    static async init(owner: Address, recipient: Address, amount: bigint, hashlock: bigint, timelock: bigint, escrowId: bigint) {
        return await TonEscrow_init(owner, recipient, amount, hashlock, timelock, escrowId);
    }
    
    static async fromInit(owner: Address, recipient: Address, amount: bigint, hashlock: bigint, timelock: bigint, escrowId: bigint) {
        const __gen_init = await TonEscrow_init(owner, recipient, amount, hashlock, timelock, escrowId);
        const address = contractAddress(0, __gen_init);
        return new TonEscrow(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new TonEscrow(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  TonEscrow_types,
        getters: TonEscrow_getters,
        receivers: TonEscrow_receivers,
        errors: TonEscrow_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: FulfillEscrow | RefundEscrow | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'FulfillEscrow') {
            body = beginCell().store(storeFulfillEscrow(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'RefundEscrow') {
            body = beginCell().store(storeRefundEscrow(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetEscrowInfo(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getEscrowInfo', builder.build())).stack;
        const result = loadGetterTupleEscrowInfo(source);
        return result;
    }
    
    async getGetStatus(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getStatus', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getGetSecret(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('getSecret', builder.build())).stack;
        const result = source.readString();
        return result;
    }
    
    async getIsExpired(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('isExpired', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getCanFulfill(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('canFulfill', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getCanRefund(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('canRefund', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
}