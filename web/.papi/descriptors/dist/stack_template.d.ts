import { StorageDescriptor, PlainDescriptor, TxDescriptor, RuntimeDescriptor, Enum, ApisFromDef, QueryFromPalletsDef, TxFromPalletsDef, EventsFromPalletsDef, ErrorsFromPalletsDef, ConstFromPalletsDef, ViewFnsFromPalletsDef, SS58String, FixedSizeBinary, Binary, FixedSizeArray } from "polkadot-api";
import { I5sesotjlssv2d, Iffmde3ekjedi9, I4mddgoa69c0a2, I2utisg9hv9r7a, I95g6i7ilua7lq, Ieniouoqkq4icf, Phase, Ibgl04rn6nbfm6, I4q39t5hn830vp, I1v7jbnil3tjns, I8jgj1nhcr2dg8, Ifn6q3equiq9qi, Ia3sb0vgvovhtg, Iav8k1edbj86k7, Itom7fk49o0c9, I4i91h98n3cv1b, I4iumukclgj8ej, Iqnbvitf7a7l3, I48i407regf59r, I6r5cbv8ttrb09, I1q8tnt1cluu5j, I8ds64oj6581v0, Ia7pdug7cdsg8g, I7bhsbas6oufr6, I9bin2jc70qt6q, TransactionPaymentReleases, Ia2lhg7l2hilo3, Ifi4da1gej1fri, Ifvgo9568rpmqc, I82jm9g7pufuel, Ic5m5lp1oioo8r, I6cs1itejju2vv, Icgljjb6j82uhn, Ib77b0fp1a6mjr, I5g2vv0ckl2m8b, Ifup3lg9ro8a0f, I5qfubnuvrnqn6, I8t3u2dv73ahbd, I7vlvrrl2pnbgk, Ie0rpl5bahldfk, XcmPalletVersionMigrationStage, I7e5oaj2qi4kl1, Ie849h3gncgvok, Iat62vud7hlod2, Ict03eedr8de9s, Ici7ejds60vj52, XcmVersionedLocation, Idh2ug6ou4a8og, Iejeo53sea6n4q, I53esa2ms463bk, Ib4jhb8tt3uung, I7offqqltf3agj, Iciucmpds8ms8l, I46vkbfg9e4sk8, I2na29tt2afp0j, I7bp9aopskbaqi, Iafqnechp3omqg, Id45pp4nmmi5c3, I237rjg1gueso, I96rqo4i9p11oo, I6h44toaeg76c7, I4ftk0glls7946, I910puuahutflf, I4nfjdef0ibh44, I74af64m08r6as, Ic8ann3kre6vdm, I1j72qfgdejqsv, I60biiepd74113, Ifhq9nad1vnuqe, In7a38730s6qs, If15el53dd76v9, I9s0ave7t0vnrk, I4fo08joqmcqnm, XcmV5Junctions, Iasb8k6ash5mjn, I8ofcg5rbj0g2c, I4adgbll7gku4i, I6pjjpfvhvcfru, I9pj91mj79qekl, I39uah9nss64h9, Ik64dknsq7k08, Ib51vk42m1po4n, Ial23jn8hp0aen, Ifpj261e8s63m3, Idcr6u6361oad9, I4ktuaksf5i1gk, I9bqtpv2ii35mp, I9j7pagd6d4bda, I2h9pmio37r7fb, Ibmr18suc9ikh9, I9iq22t0burs89, I5u8olqbbvfnvf, I5utcetro501ir, I2i50r8rcfts3l, Idlcrgc3dl5usf, I8k3rnvpeeh4hv, I2am3fetaem2gu, Ifccifqltb5obi, Iadtsfv699cq8b, Ialpmgmhr3gk5r, I4cbvqmqadhrea, I3sdol54kg5jaq, I8fougodaj6di6, I81vt5eq60l4b6, I3vh014cqgmrfd, Ia5cotcvi888ln, I21jsa919m88fd, Iegif7m3upfe1k, I9kt8c221c83ln, Ic76kfh5ebqkpl, Icscpmubum33bq, I21d2olof7eb60, Ibgm4rnf22lal1, Ie68np0vpihith, I9bnv6lu0crf1q, Iauhjqifrdklq7, Ie1uso9m8rt5cf, I40pqum1mu8qg3, I1r4c2ghbtvjuc, I1jm8m1rh9e20v, I7fv0kt52b21r5, I7uphs141r660c, I8pgovs95pnrrd, I4k7i1bf6cpso8, I5vanth86cd3mt, Ib1ilbm5ipoh62, I14p0q0qs0fqbj, Iejaamcnc7tiq6, I9lv278elt0l38, I54i58ksnkqnaq, I8qvsahrnac2tn, I62qodqf8oaocv, Ia6ds36j6alqgf, Ic6cqd9g0t65v0, I2kds5jji7slh8, Ia9mkdf6l44shb, I9l2s4klu0831o, I2ctrt5nqb8o7c, I711qahikocb1c, I6o1er683vod1j, Id6gojh30v9ib2, Ide1bahhh47lj9, Id9uqtigc0il3v, Ic68lsi7chpv5k, Iek0boln8pgnko, I452bkd71b385t, Ie83f0p0ke1f4u, Ib9nmpn9ru9aeh, Ie5l999tf7t2te, I5gn45n88f3ubg, I7ujehsqggbv5l, I3ddb6lhc3jmtj, I8ligieds2efci, I3qt1hgg4djhgb, Ia82mnkmeo2rhc, Ievs0l5092qcdo, Icbccs0ug47ilf, I855j4i3kr8ko1, Ibi6cpipuph58g, Idd7hd99u0ho0n, Iafscmv8tjf0ou, I100l07kaehdlp, I6gnbnvip5vvdi, Icv68aq8841478, Ic262ibdoec56a, Iflcfm9b6nlmdd, Ijrsf4mnp3eka, Id5fm4p8lj5qgi, I8tjvj9uq4b7hi, I4fooe9dun9o0t, Ipc96b675vau1, Ifqi1snmg1eqha, I2r55jl5mh3adj, Iph9c4rn81ub2, Ier2cke86dqbr2, I6pku2di5bd8n3, I5rtkmhm2dng4u, I39t01nnod9109, I6v8sm60vvkmk7, I1qmtmbe5so8r3, Ih99m6ehpcar7, Idgorhsbgdq2ap, I9ubb2kqevnu6t, I2hq50pu2kdjpo, I9acqruh7322g2, I137t1cld92pod, I61d51nv4cou88, If8u5kl4h8070m, Ibmuil6p3vl83l, I7lul91g50ae87, Icl7nl1rfeog3i, Iasr6pj6shs0fl, I2uqmls7kcdnii, Idg69klialbkb8, I7r6b7145022pp, I30pg328m00nr3, Icmrn7bogp28cs, I7m9b5plj4h5ot, I9onhk772nfs4f, I3l6bnksrmt56r, Idh09k0l2pmdcg, I7uoiphbm0tj4r, I512p1n7qt24l8, I6s1nbislhk619, I3gghqnh2mj0is, I6iv852roh6t3h, I9oc2o6itbiopq, Ibslgga81p36aa, I1rvj4ubaplho0, Ia3uu7lqcc1q1i, I7crucfnonitkn, I7tmrp94r9sq4n, I3uua81e9uvgnp, I9p6tgcfbrrlod, Ibh7279nftp2hh, I8479qlmjf9la2, I6jm7rmcmjl45d, Ib25q8de7tg90l, I7uibdp0qbpf1m, I2crm4j70329fs, Ich1gn08cdvajd, I8pdmes4qb1slv, I3spiqmkfrd4nh, I38bk60rnerv88, Ics676nkrsbu5j, Ifv4jftsc618sl, Iep1lmt6q3s6r3, I1fac16213rie2, Ifjt77oc391o43, Itvt1jsipv0lc, Ick3mveut33f44, I719lqkkbtikbl, Ie4intrc3n8jfu, I2rg5btjrsqec0, Ibdqerrooruuq9, I8u2ba9jeiu6q0, I7ieadb293k6b4, I2jtkn2pq6gl93, Iavmg865r513th, I6gobf0er3s1tq, I52ueqm37mfa10, Idkg126uvecems, I1ctqnpt9rk0bn, I5dk96r09q9b08, I34ghkccn70ma, I5r8t4iaend96p, Ifvkaggraijrot, I4arjljr6dpflb, If4vimo9j229oc, Iaqet9jc3ihboe, Ic952bubvq4k7d, I2v50gu3s1aqk6, Iabpgqcjikia83, I4gil44d08grh, I7u915mvkdsb08, Ifgpmvcafkjte5, If7uv525tdvv7a, I2an1fs2eiebjp, TransactionValidityTransactionSource, I9ask1o4tfvcvs, Icerf8h8pdu8ss, I6spmpef2c7svf, Iei2mvq0mjvt81, Icmt859r8ealc1, Ic1d4u2opv3fst, Ico18ks790i2bl, I815pbp5omtss, I3ju6ot8lfmk90, Ie9sr1iqcg3cgm, I1mqgk2tmnn9i2, I6lr8sctk0bi4e, I33kjf48l20rf5 } from "./common-types";
type AnonymousEnum<T extends {}> = T & {
    __anonymous: true;
};
type MyTuple<T> = [T, ...T[]];
type SeparateUndefined<T> = undefined extends T ? undefined | Exclude<T, undefined> : T;
type Anonymize<T> = SeparateUndefined<T extends FixedSizeBinary<infer L> ? number extends L ? Binary : FixedSizeBinary<L> : T extends string | number | bigint | boolean | void | undefined | null | symbol | Uint8Array | Enum<any> ? T : T extends AnonymousEnum<infer V> ? Enum<V> : T extends MyTuple<any> ? {
    [K in keyof T]: T[K];
} : T extends [] ? [] : T extends FixedSizeArray<infer L, infer T> ? number extends L ? Array<T> : FixedSizeArray<L, T> : {
    [K in keyof T & string]: T[K];
}>;
type IStorage = {
    System: {
        /**
         * The full account information for a particular account ID.
         */
        Account: StorageDescriptor<[Key: SS58String], Anonymize<I5sesotjlssv2d>, false, never>;
        /**
         * Total extrinsics count for the current block.
         */
        ExtrinsicCount: StorageDescriptor<[], number, true, never>;
        /**
         * Whether all inherents have been applied.
         */
        InherentsApplied: StorageDescriptor<[], boolean, false, never>;
        /**
         * The current weight for the block.
         */
        BlockWeight: StorageDescriptor<[], Anonymize<Iffmde3ekjedi9>, false, never>;
        /**
         * Total length (in bytes) for all extrinsics put together, for the current block.
         */
        AllExtrinsicsLen: StorageDescriptor<[], number, true, never>;
        /**
         * Map of block numbers to block hashes.
         */
        BlockHash: StorageDescriptor<[Key: number], FixedSizeBinary<32>, false, never>;
        /**
         * Extrinsics data for the current block (maps an extrinsic's index to its data).
         */
        ExtrinsicData: StorageDescriptor<[Key: number], Binary, false, never>;
        /**
         * The current block number being processed. Set by `execute_block`.
         */
        Number: StorageDescriptor<[], number, false, never>;
        /**
         * Hash of the previous block.
         */
        ParentHash: StorageDescriptor<[], FixedSizeBinary<32>, false, never>;
        /**
         * Digest of the current block, also part of the block header.
         */
        Digest: StorageDescriptor<[], Anonymize<I4mddgoa69c0a2>, false, never>;
        /**
         * Events deposited for the current block.
         *
         * NOTE: The item is unbound and should therefore never be read on chain.
         * It could otherwise inflate the PoV size of a block.
         *
         * Events have a large in-memory size. Box the events to not go out-of-memory
         * just in case someone still reads them from within the runtime.
         */
        Events: StorageDescriptor<[], Anonymize<I2utisg9hv9r7a>, false, never>;
        /**
         * The number of events in the `Events<T>` list.
         */
        EventCount: StorageDescriptor<[], number, false, never>;
        /**
         * Mapping between a topic (represented by T::Hash) and a vector of indexes
         * of events in the `<Events<T>>` list.
         *
         * All topic vectors have deterministic storage locations depending on the topic. This
         * allows light-clients to leverage the changes trie storage tracking mechanism and
         * in case of changes fetch the list of events of interest.
         *
         * The value has the type `(BlockNumberFor<T>, EventIndex)` because if we used only just
         * the `EventIndex` then in case if the topic has the same contents on the next block
         * no notification will be triggered thus the event might be lost.
         */
        EventTopics: StorageDescriptor<[Key: FixedSizeBinary<32>], Anonymize<I95g6i7ilua7lq>, false, never>;
        /**
         * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
         */
        LastRuntimeUpgrade: StorageDescriptor<[], Anonymize<Ieniouoqkq4icf>, true, never>;
        /**
         * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
         */
        UpgradedToU32RefCount: StorageDescriptor<[], boolean, false, never>;
        /**
         * True if we have upgraded so that AccountInfo contains three types of `RefCount`. False
         * (default) if not.
         */
        UpgradedToTripleRefCount: StorageDescriptor<[], boolean, false, never>;
        /**
         * The execution phase of the block.
         */
        ExecutionPhase: StorageDescriptor<[], Phase, true, never>;
        /**
         * `Some` if a code upgrade has been authorized.
         */
        AuthorizedUpgrade: StorageDescriptor<[], Anonymize<Ibgl04rn6nbfm6>, true, never>;
        /**
         * The weight reclaimed for the extrinsic.
         *
         * This information is available until the end of the extrinsic execution.
         * More precisely this information is removed in `note_applied_extrinsic`.
         *
         * Logic doing some post dispatch weight reduction must update this storage to avoid duplicate
         * reduction.
         */
        ExtrinsicWeightReclaimed: StorageDescriptor<[], Anonymize<I4q39t5hn830vp>, false, never>;
    };
    ParachainSystem: {
        /**
         * Latest included block descendants the runtime accepted. In other words, these are
         * ancestors of the currently executing block which have not been included in the observed
         * relay-chain state.
         *
         * The segment length is limited by the capacity returned from the [`ConsensusHook`] configured
         * in the pallet.
         */
        UnincludedSegment: StorageDescriptor<[], Anonymize<I1v7jbnil3tjns>, false, never>;
        /**
         * Storage field that keeps track of bandwidth used by the unincluded segment along with the
         * latest HRMP watermark. Used for limiting the acceptance of new blocks with
         * respect to relay chain constraints.
         */
        AggregatedUnincludedSegment: StorageDescriptor<[], Anonymize<I8jgj1nhcr2dg8>, true, never>;
        /**
         * In case of a scheduled upgrade, this storage field contains the validation code to be
         * applied.
         *
         * As soon as the relay chain gives us the go-ahead signal, we will overwrite the
         * [`:code`][sp_core::storage::well_known_keys::CODE] which will result the next block process
         * with the new validation code. This concludes the upgrade process.
         */
        PendingValidationCode: StorageDescriptor<[], Binary, false, never>;
        /**
         * Validation code that is set by the parachain and is to be communicated to collator and
         * consequently the relay-chain.
         *
         * This will be cleared in `on_initialize` of each new block if no other pallet already set
         * the value.
         */
        NewValidationCode: StorageDescriptor<[], Binary, true, never>;
        /**
         * The [`PersistedValidationData`] set for this block.
         *
         * This value is expected to be set only once by the [`Pallet::set_validation_data`] inherent.
         */
        ValidationData: StorageDescriptor<[], Anonymize<Ifn6q3equiq9qi>, true, never>;
        /**
         * Were the validation data set to notify the relay chain?
         */
        DidSetValidationCode: StorageDescriptor<[], boolean, false, never>;
        /**
         * The relay chain block number associated with the last parachain block.
         *
         * This is updated in `on_finalize`.
         */
        LastRelayChainBlockNumber: StorageDescriptor<[], number, false, never>;
        /**
         * An option which indicates if the relay-chain restricts signalling a validation code upgrade.
         * In other words, if this is `Some` and [`NewValidationCode`] is `Some` then the produced
         * candidate will be invalid.
         *
         * This storage item is a mirror of the corresponding value for the current parachain from the
         * relay-chain. This value is ephemeral which means it doesn't hit the storage. This value is
         * set after the inherent.
         */
        UpgradeRestrictionSignal: StorageDescriptor<[], Anonymize<Ia3sb0vgvovhtg>, false, never>;
        /**
         * Optional upgrade go-ahead signal from the relay-chain.
         *
         * This storage item is a mirror of the corresponding value for the current parachain from the
         * relay-chain. This value is ephemeral which means it doesn't hit the storage. This value is
         * set after the inherent.
         */
        UpgradeGoAhead: StorageDescriptor<[], Anonymize<Iav8k1edbj86k7>, false, never>;
        /**
         * The state proof for the last relay parent block.
         *
         * This field is meant to be updated each block with the validation data inherent. Therefore,
         * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
         *
         * This data is also absent from the genesis.
         */
        RelayStateProof: StorageDescriptor<[], Anonymize<Itom7fk49o0c9>, true, never>;
        /**
         * The snapshot of some state related to messaging relevant to the current parachain as per
         * the relay parent.
         *
         * This field is meant to be updated each block with the validation data inherent. Therefore,
         * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
         *
         * This data is also absent from the genesis.
         */
        RelevantMessagingState: StorageDescriptor<[], Anonymize<I4i91h98n3cv1b>, true, never>;
        /**
         * The parachain host configuration that was obtained from the relay parent.
         *
         * This field is meant to be updated each block with the validation data inherent. Therefore,
         * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
         *
         * This data is also absent from the genesis.
         */
        HostConfiguration: StorageDescriptor<[], Anonymize<I4iumukclgj8ej>, true, never>;
        /**
         * The last downward message queue chain head we have observed.
         *
         * This value is loaded before and saved after processing inbound downward messages carried
         * by the system inherent.
         */
        LastDmqMqcHead: StorageDescriptor<[], FixedSizeBinary<32>, false, never>;
        /**
         * The message queue chain heads we have observed per each channel incoming channel.
         *
         * This value is loaded before and saved after processing inbound downward messages carried
         * by the system inherent.
         */
        LastHrmpMqcHeads: StorageDescriptor<[], Anonymize<Iqnbvitf7a7l3>, false, never>;
        /**
         * Number of downward messages processed in a block.
         *
         * This will be cleared in `on_initialize` of each new block.
         */
        ProcessedDownwardMessages: StorageDescriptor<[], number, false, never>;
        /**
         * The last processed downward message.
         *
         * We need to keep track of this to filter the messages that have been already processed.
         */
        LastProcessedDownwardMessage: StorageDescriptor<[], Anonymize<I48i407regf59r>, true, never>;
        /**
         * HRMP watermark that was set in a block.
         */
        HrmpWatermark: StorageDescriptor<[], number, false, never>;
        /**
         * The last processed HRMP message.
         *
         * We need to keep track of this to filter the messages that have been already processed.
         */
        LastProcessedHrmpMessage: StorageDescriptor<[], Anonymize<I48i407regf59r>, true, never>;
        /**
         * HRMP messages that were sent in a block.
         *
         * This will be cleared in `on_initialize` of each new block.
         */
        HrmpOutboundMessages: StorageDescriptor<[], Anonymize<I6r5cbv8ttrb09>, false, never>;
        /**
         * Upward messages that were sent in a block.
         *
         * This will be cleared in `on_initialize` for each new block.
         */
        UpwardMessages: StorageDescriptor<[], Anonymize<Itom7fk49o0c9>, false, never>;
        /**
         * Upward messages that are still pending and not yet sent to the relay chain.
         */
        PendingUpwardMessages: StorageDescriptor<[], Anonymize<Itom7fk49o0c9>, false, never>;
        /**
         * Upward signals that are still pending and not yet sent to the relay chain.
         *
         * This will be cleared in `on_finalize` for each block.
         */
        PendingUpwardSignals: StorageDescriptor<[], Anonymize<Itom7fk49o0c9>, false, never>;
        /**
         * The factor to multiply the base delivery fee by for UMP.
         */
        UpwardDeliveryFeeFactor: StorageDescriptor<[], bigint, false, never>;
        /**
         * The number of HRMP messages we observed in `on_initialize` and thus used that number for
         * announcing the weight of `on_initialize` and `on_finalize`.
         */
        AnnouncedHrmpMessagesPerCandidate: StorageDescriptor<[], number, false, never>;
        /**
         * The weight we reserve at the beginning of the block for processing XCMP messages. This
         * overrides the amount set in the Config trait.
         */
        ReservedXcmpWeightOverride: StorageDescriptor<[], Anonymize<I4q39t5hn830vp>, true, never>;
        /**
         * The weight we reserve at the beginning of the block for processing DMP messages. This
         * overrides the amount set in the Config trait.
         */
        ReservedDmpWeightOverride: StorageDescriptor<[], Anonymize<I4q39t5hn830vp>, true, never>;
        /**
         * A custom head data that should be returned as result of `validate_block`.
         *
         * See `Pallet::set_custom_validation_head_data` for more information.
         */
        CustomValidationHeadData: StorageDescriptor<[], Binary, true, never>;
    };
    Timestamp: {
        /**
         * The current time for the current block.
         */
        Now: StorageDescriptor<[], bigint, false, never>;
        /**
         * Whether the timestamp has been updated in this block.
         *
         * This value is updated to `true` upon successful submission of a timestamp by a node.
         * It is then checked at the end of each block execution in the `on_finalize` hook.
         */
        DidUpdate: StorageDescriptor<[], boolean, false, never>;
    };
    ParachainInfo: {
        /**
        
         */
        ParachainId: StorageDescriptor<[], number, false, never>;
    };
    Balances: {
        /**
         * The total units issued in the system.
         */
        TotalIssuance: StorageDescriptor<[], bigint, false, never>;
        /**
         * The total units of outstanding deactivated balance in the system.
         */
        InactiveIssuance: StorageDescriptor<[], bigint, false, never>;
        /**
         * The Balances pallet example of storing the balance of an account.
         *
         * # Example
         *
         * ```nocompile
         * impl pallet_balances::Config for Runtime {
         * type AccountStore = StorageMapShim<Self::Account<Runtime>, frame_system::Provider<Runtime>, AccountId, Self::AccountData<Balance>>
         * }
         * ```
         *
         * You can also store the balance of an account in the `System` pallet.
         *
         * # Example
         *
         * ```nocompile
         * impl pallet_balances::Config for Runtime {
         * type AccountStore = System
         * }
         * ```
         *
         * But this comes with tradeoffs, storing account balances in the system pallet stores
         * `frame_system` data alongside the account data contrary to storing account balances in the
         * `Balances` pallet, which uses a `StorageMap` to store balances data only.
         * NOTE: This is only used in the case that this pallet is used to store balances.
         */
        Account: StorageDescriptor<[Key: SS58String], Anonymize<I1q8tnt1cluu5j>, false, never>;
        /**
         * Any liquidity locks on some account balances.
         * NOTE: Should only be accessed when setting, changing and freeing a lock.
         *
         * Use of locks is deprecated in favour of freezes. See `https://github.com/paritytech/substrate/pull/12951/`
         */
        Locks: StorageDescriptor<[Key: SS58String], Anonymize<I8ds64oj6581v0>, false, never>;
        /**
         * Named reserves on some account balances.
         *
         * Use of reserves is deprecated in favour of holds. See `https://github.com/paritytech/substrate/pull/12951/`
         */
        Reserves: StorageDescriptor<[Key: SS58String], Anonymize<Ia7pdug7cdsg8g>, false, never>;
        /**
         * Holds on account balances.
         */
        Holds: StorageDescriptor<[Key: SS58String], Anonymize<I7bhsbas6oufr6>, false, never>;
        /**
         * Freeze locks on account balances.
         */
        Freezes: StorageDescriptor<[Key: SS58String], Anonymize<I9bin2jc70qt6q>, false, never>;
    };
    TransactionPayment: {
        /**
        
         */
        NextFeeMultiplier: StorageDescriptor<[], bigint, false, never>;
        /**
        
         */
        StorageVersion: StorageDescriptor<[], TransactionPaymentReleases, false, never>;
        /**
         * The `OnChargeTransaction` stores the withdrawn tx fee here.
         *
         * Use `withdraw_txfee` and `remaining_txfee` to access from outside the crate.
         */
        TxPaymentCredit: StorageDescriptor<[], bigint, true, never>;
    };
    Sudo: {
        /**
         * The `AccountId` of the sudo key.
         */
        Key: StorageDescriptor<[], SS58String, true, never>;
    };
    Authorship: {
        /**
         * Author of current block.
         */
        Author: StorageDescriptor<[], SS58String, true, never>;
    };
    CollatorSelection: {
        /**
         * The invulnerable, permissioned collators. This list must be sorted.
         */
        Invulnerables: StorageDescriptor<[], Anonymize<Ia2lhg7l2hilo3>, false, never>;
        /**
         * The (community, limited) collation candidates. `Candidates` and `Invulnerables` should be
         * mutually exclusive.
         *
         * This list is sorted in ascending order by deposit and when the deposits are equal, the least
         * recently updated is considered greater.
         */
        CandidateList: StorageDescriptor<[], Anonymize<Ifi4da1gej1fri>, false, never>;
        /**
         * Last block authored by collator.
         */
        LastAuthoredBlock: StorageDescriptor<[Key: SS58String], number, false, never>;
        /**
         * Desired number of candidates.
         *
         * This should ideally always be less than [`Config::MaxCandidates`] for weights to be correct.
         */
        DesiredCandidates: StorageDescriptor<[], number, false, never>;
        /**
         * Fixed amount to deposit to become a collator.
         *
         * When a collator calls `leave_intent` they immediately receive the deposit back.
         */
        CandidacyBond: StorageDescriptor<[], bigint, false, never>;
    };
    Session: {
        /**
         * The current set of validators.
         */
        Validators: StorageDescriptor<[], Anonymize<Ia2lhg7l2hilo3>, false, never>;
        /**
         * Current index of the session.
         */
        CurrentIndex: StorageDescriptor<[], number, false, never>;
        /**
         * True if the underlying economic identities or weighting behind the validators
         * has changed in the queued validator set.
         */
        QueuedChanged: StorageDescriptor<[], boolean, false, never>;
        /**
         * The queued keys for the next session. When the next session begins, these keys
         * will be used to determine the validator's session keys.
         */
        QueuedKeys: StorageDescriptor<[], Anonymize<Ifvgo9568rpmqc>, false, never>;
        /**
         * Indices of disabled validators.
         *
         * The vec is always kept sorted so that we can find whether a given validator is
         * disabled using binary search. It gets cleared when `on_session_ending` returns
         * a new set of identities.
         */
        DisabledValidators: StorageDescriptor<[], Anonymize<I95g6i7ilua7lq>, false, never>;
        /**
         * The next session keys for a validator.
         */
        NextKeys: StorageDescriptor<[Key: SS58String], FixedSizeBinary<32>, true, never>;
        /**
         * The owner of a key. The key is the `KeyTypeId` + the encoded key.
         */
        KeyOwner: StorageDescriptor<[Key: Anonymize<I82jm9g7pufuel>], SS58String, true, never>;
        /**
         * Accounts whose keys were set via `SessionInterface` (external path) without
         * incrementing the consumer reference or placing a key deposit. `do_purge_keys`
         * only decrements consumers for accounts that were registered through the local
         * session pallet.
         */
        ExternallySetKeys: StorageDescriptor<[Key: SS58String], null, true, never>;
    };
    Aura: {
        /**
         * The current authority set.
         */
        Authorities: StorageDescriptor<[], Anonymize<Ic5m5lp1oioo8r>, false, never>;
        /**
         * The current slot of this block.
         *
         * This will be set in `on_initialize`.
         */
        CurrentSlot: StorageDescriptor<[], bigint, false, never>;
    };
    AuraExt: {
        /**
         * Serves as cache for the authorities.
         *
         * The authorities in AuRa are overwritten in `on_initialize` when we switch to a new session,
         * but we require the old authorities to verify the seal when validating a PoV. This will
         * always be updated to the latest AuRa authorities in `on_finalize`.
         */
        Authorities: StorageDescriptor<[], Anonymize<Ic5m5lp1oioo8r>, false, never>;
        /**
         * Current relay chain slot paired with a number of authored blocks.
         *
         * This is updated in [`FixedVelocityConsensusHook::on_state_proof`] with the current relay
         * chain slot as provided by the relay chain state proof.
         */
        RelaySlotInfo: StorageDescriptor<[], Anonymize<I6cs1itejju2vv>, true, never>;
    };
    XcmpQueue: {
        /**
         * The suspended inbound XCMP channels. All others are not suspended.
         *
         * This is a `StorageValue` instead of a `StorageMap` since we expect multiple reads per block
         * to different keys with a one byte payload. The access to `BoundedBTreeSet` will be cached
         * within the block and therefore only included once in the proof size.
         *
         * NOTE: The PoV benchmarking cannot know this and will over-estimate, but the actual proof
         * will be smaller.
         */
        InboundXcmpSuspended: StorageDescriptor<[], Anonymize<Icgljjb6j82uhn>, false, never>;
        /**
         * The non-empty XCMP channels in order of becoming non-empty, and the index of the first
         * and last outbound message. If the two indices are equal, then it indicates an empty
         * queue and there must be a non-`Ok` `OutboundStatus`. We assume queues grow no greater
         * than 65535 items. Queue indices for normal messages begin at one; zero is reserved in
         * case of the need to send a high-priority signal message this block.
         * The bool is true if there is a signal message waiting to be sent.
         */
        OutboundXcmpStatus: StorageDescriptor<[], Anonymize<Ib77b0fp1a6mjr>, false, never>;
        /**
         * The messages outbound in a given XCMP channel.
         */
        OutboundXcmpMessages: StorageDescriptor<Anonymize<I5g2vv0ckl2m8b>, Binary, false, never>;
        /**
         * Any signal messages waiting to be sent.
         */
        SignalMessages: StorageDescriptor<[Key: number], Binary, false, never>;
        /**
         * The configuration which controls the dynamics of the outbound queue.
         */
        QueueConfig: StorageDescriptor<[], Anonymize<Ifup3lg9ro8a0f>, false, never>;
        /**
         * Whether or not the XCMP queue is suspended from executing incoming XCMs or not.
         */
        QueueSuspended: StorageDescriptor<[], boolean, false, never>;
        /**
         * The factor to multiply the base delivery fee by.
         */
        DeliveryFeeFactor: StorageDescriptor<[Key: number], bigint, false, never>;
    };
    PolkadotXcm: {
        /**
         * The latest available query index.
         */
        QueryCounter: StorageDescriptor<[], bigint, false, never>;
        /**
         * The ongoing queries.
         */
        Queries: StorageDescriptor<[Key: bigint], Anonymize<I5qfubnuvrnqn6>, true, never>;
        /**
         * The existing asset traps.
         *
         * Key is the blake2 256 hash of (origin, versioned `Assets`) pair. Value is the number of
         * times this pair has been trapped (usually just 1 if it exists at all).
         */
        AssetTraps: StorageDescriptor<[Key: FixedSizeBinary<32>], number, false, never>;
        /**
         * Default version to encode XCM when latest version of destination is unknown. If `None`,
         * then the destinations whose XCM version is unknown are considered unreachable.
         */
        SafeXcmVersion: StorageDescriptor<[], number, true, never>;
        /**
         * The Latest versions that we know various locations support.
         */
        SupportedVersion: StorageDescriptor<Anonymize<I8t3u2dv73ahbd>, number, true, never>;
        /**
         * All locations that we have requested version notifications from.
         */
        VersionNotifiers: StorageDescriptor<Anonymize<I8t3u2dv73ahbd>, bigint, true, never>;
        /**
         * The target locations that are subscribed to our version changes, as well as the most recent
         * of our versions we informed them of.
         */
        VersionNotifyTargets: StorageDescriptor<Anonymize<I8t3u2dv73ahbd>, Anonymize<I7vlvrrl2pnbgk>, true, never>;
        /**
         * Destinations whose latest XCM version we would like to know. Duplicates not allowed, and
         * the `u32` counter is the number of times that a send to the destination has been attempted,
         * which is used as a prioritization.
         */
        VersionDiscoveryQueue: StorageDescriptor<[], Anonymize<Ie0rpl5bahldfk>, false, never>;
        /**
         * The current migration's stage, if any.
         */
        CurrentMigration: StorageDescriptor<[], XcmPalletVersionMigrationStage, true, never>;
        /**
         * Fungible assets which we know are locked on a remote chain.
         */
        RemoteLockedFungibles: StorageDescriptor<Anonymize<Ie849h3gncgvok>, Anonymize<I7e5oaj2qi4kl1>, true, never>;
        /**
         * Fungible assets which we know are locked on this chain.
         */
        LockedFungibles: StorageDescriptor<[Key: SS58String], Anonymize<Iat62vud7hlod2>, true, never>;
        /**
         * Global suspension state of the XCM executor.
         */
        XcmExecutionSuspended: StorageDescriptor<[], boolean, false, never>;
        /**
         * Whether or not incoming XCMs (both executed locally and received) should be recorded.
         * Only one XCM program will be recorded at a time.
         * This is meant to be used in runtime APIs, and it's advised it stays false
         * for all other use cases, so as to not degrade regular performance.
         *
         * Only relevant if this pallet is being used as the [`xcm_executor::traits::RecordXcm`]
         * implementation in the XCM executor configuration.
         */
        ShouldRecordXcm: StorageDescriptor<[], boolean, false, never>;
        /**
         * If [`ShouldRecordXcm`] is set to true, then the last XCM program executed locally
         * will be stored here.
         * Runtime APIs can fetch the XCM that was executed by accessing this value.
         *
         * Only relevant if this pallet is being used as the [`xcm_executor::traits::RecordXcm`]
         * implementation in the XCM executor configuration.
         */
        RecordedXcm: StorageDescriptor<[], Anonymize<Ict03eedr8de9s>, true, never>;
        /**
         * Map of authorized aliasers of local origins. Each local location can authorize a list of
         * other locations to alias into it. Each aliaser is only valid until its inner `expiry`
         * block number.
         */
        AuthorizedAliases: StorageDescriptor<[Key: XcmVersionedLocation], Anonymize<Ici7ejds60vj52>, true, never>;
    };
    MessageQueue: {
        /**
         * The index of the first and last (non-empty) pages.
         */
        BookStateFor: StorageDescriptor<[Key: Anonymize<Iejeo53sea6n4q>], Anonymize<Idh2ug6ou4a8og>, false, never>;
        /**
         * The origin at which we should begin servicing.
         */
        ServiceHead: StorageDescriptor<[], Anonymize<Iejeo53sea6n4q>, true, never>;
        /**
         * The map of page indices to pages.
         */
        Pages: StorageDescriptor<Anonymize<Ib4jhb8tt3uung>, Anonymize<I53esa2ms463bk>, true, never>;
    };
    TemplatePallet: {
        /**
         * Storage for proof-of-existence claims.
         * Maps a 32-byte hash to the claim details (owner, block number).
         */
        Claims: StorageDescriptor<[Key: FixedSizeBinary<32>], Anonymize<I7offqqltf3agj>, true, never>;
    };
    SocialAppRegistry: {
        /**
         * Auto-incrementing app ID counter.
         */
        NextAppId: StorageDescriptor<[], number, false, never>;
        /**
         * Main registry: AppId -> AppInfo.
         */
        Apps: StorageDescriptor<[Key: number], Anonymize<Iciucmpds8ms8l>, true, never>;
        /**
         * Reverse lookup: AccountId -> Vec<AppId> (apps owned by this account).
         */
        AppsByOwner: StorageDescriptor<[Key: SS58String], Anonymize<Icgljjb6j82uhn>, false, never>;
    };
    SocialProfiles: {
        /**
         * Total number of profiles (for stats).
         */
        ProfileCount: StorageDescriptor<[], number, false, never>;
        /**
         * Main registry: AccountId -> ProfileInfo.
         */
        Profiles: StorageDescriptor<[Key: SS58String], Anonymize<I46vkbfg9e4sk8>, true, never>;
    };
    SocialGraph: {
        /**
         * Follow relationship: (follower, followed) -> FollowInfo.
         */
        Follows: StorageDescriptor<Anonymize<I2na29tt2afp0j>, number, true, never>;
        /**
         * Follower count per account.
         */
        FollowerCount: StorageDescriptor<[Key: SS58String], number, false, never>;
        /**
         * Following count per account.
         */
        FollowingCount: StorageDescriptor<[Key: SS58String], number, false, never>;
    };
    SocialFeeds: {
        /**
         * Auto-incrementing Post ID counter.
         */
        NextPostId: StorageDescriptor<[], bigint, false, never>;
        /**
         * Main post storage: PostId -> PostInfo.
         */
        Posts: StorageDescriptor<[Key: bigint], Anonymize<I7bp9aopskbaqi>, true, never>;
        /**
         * Posts by author: AccountId -> BoundedVec<PostId>.
         */
        PostsByAuthor: StorageDescriptor<[Key: SS58String], Anonymize<Iafqnechp3omqg>, false, never>;
        /**
         * Replies to a post: PostId -> BoundedVec<PostId>.
         */
        Replies: StorageDescriptor<[Key: bigint], Anonymize<Iafqnechp3omqg>, false, never>;
        /**
         * Timeline index: (author, (block_number, post_id)) -> ().
         *
         * Secondary index that complements `PostsByAuthor` (which stores a
         * flat `BoundedVec` and forces callers to download everything to
         * paginate). Using `Twox64Concat` on the inner `(block, post_id)`
         * tuple is safe because the block-number/post-id are not user
         * supplied and the key space is sparse per author — no second
         * pre-image concerns, and the concat variant keeps the raw key
         * suffix available so iteration yields the decoded tuple.
         *
         * Callers paginate via `Pallet::posts_timeline(author, from, to, limit)`
         * which returns entries newest-first by collecting and sorting the
         * keys for that author. With `MaxPostsPerAuthor` bounded, the cost is
         * bounded too; the win is that off-chain clients can ask for just
         * the slice they need without re-fetching the full vec.
         */
        PostsTimeline: StorageDescriptor<Anonymize<Id45pp4nmmi5c3>, null, true, never>;
        /**
         * Per-viewer unlock records. Keyed by `(post_id, viewer)` — the
         * post_id first lets the OCW iterate unlocks for a given post
         * cheaply. A `None` `wrapped_key` means "payment received, waiting
         * for the collator to deliver".
         */
        Unlocks: StorageDescriptor<Anonymize<I96rqo4i9p11oo>, Anonymize<I237rjg1gueso>, true, never>;
        /**
         * Index of unlocks still awaiting key delivery. The OCW iterates
         * this map to find work. A present key == pending; it is removed
         * when the key is delivered.
         */
        PendingUnlocks: StorageDescriptor<[Key: Anonymize<I96rqo4i9p11oo>], null, true, never>;
        /**
         * On-chain record of the custodial key service (collator).
         */
        KeyService: StorageDescriptor<[], Anonymize<I6h44toaeg76c7>, true, never>;
    };
    Identity: {
        /**
         * Information that is pertinent to identify the entity behind an account. First item is the
         * registration, second is the account's primary username.
         *
         * TWOX-NOTE: OK ― `AccountId` is a secure hash.
         */
        IdentityOf: StorageDescriptor<[Key: SS58String], Anonymize<I4ftk0glls7946>, true, never>;
        /**
         * Identifies the primary username of an account.
         */
        UsernameOf: StorageDescriptor<[Key: SS58String], Binary, true, never>;
        /**
         * The super-identity of an alternative "sub" identity together with its name, within that
         * context. If the account is not some other account's sub-identity, then just `None`.
         */
        SuperOf: StorageDescriptor<[Key: SS58String], Anonymize<I910puuahutflf>, true, never>;
        /**
         * Alternative "sub" identities of this account.
         *
         * The first item is the deposit, the second is a vector of the accounts.
         *
         * TWOX-NOTE: OK ― `AccountId` is a secure hash.
         */
        SubsOf: StorageDescriptor<[Key: SS58String], Anonymize<I4nfjdef0ibh44>, false, never>;
        /**
         * The set of registrars. Not expected to get very big as can only be added through a
         * special origin (likely a council motion).
         *
         * The index into this can be cast to `RegistrarIndex` to get a valid value.
         */
        Registrars: StorageDescriptor<[], Anonymize<I74af64m08r6as>, false, never>;
        /**
         * A map of the accounts who are authorized to grant usernames.
         */
        AuthorityOf: StorageDescriptor<[Key: Binary], Anonymize<Ic8ann3kre6vdm>, true, never>;
        /**
         * Reverse lookup from `username` to the `AccountId` that has registered it and the provider of
         * the username. The `owner` value should be a key in the `UsernameOf` map, but it may not if
         * the user has cleared their username or it has been removed.
         *
         * Multiple usernames may map to the same `AccountId`, but `UsernameOf` will only map to one
         * primary username.
         */
        UsernameInfoOf: StorageDescriptor<[Key: Binary], Anonymize<I1j72qfgdejqsv>, true, never>;
        /**
         * Usernames that an authority has granted, but that the account controller has not confirmed
         * that they want it. Used primarily in cases where the `AccountId` cannot provide a signature
         * because they are a pure proxy, multisig, etc. In order to confirm it, they should call
         * [accept_username](`Call::accept_username`).
         *
         * First tuple item is the account and second is the acceptance deadline.
         */
        PendingUsernames: StorageDescriptor<[Key: Binary], Anonymize<I60biiepd74113>, true, never>;
        /**
         * Usernames for which the authority that granted them has started the removal process by
         * unbinding them. Each unbinding username maps to its grace period expiry, which is the first
         * block in which the username could be deleted through a
         * [remove_username](`Call::remove_username`) call.
         */
        UnbindingUsernames: StorageDescriptor<[Key: Binary], number, true, never>;
    };
    SocialManagers: {
        /**
         * Active manager authorizations, keyed by `(owner, manager)`.
         *
         * We key by raw `AccountId` on both axes because this pallet piggy-backs
         * on `pallet-social-profiles`' one-profile-per-account invariant: the
         * owner's `AccountId` *is* their profile id.
         */
        ProfileManagers: StorageDescriptor<Anonymize<I2na29tt2afp0j>, Anonymize<Ifhq9nad1vnuqe>, true, never>;
        /**
         * Number of active manager entries for each owner. Maintained alongside
         * [`ProfileManagers`] so we can enforce [`Config::MaxManagersPerOwner`]
         * without iterating the prefix on every insert.
         */
        ManagerCount: StorageDescriptor<[Key: SS58String], number, false, never>;
    };
    Sponsorship: {
        /**
         * "Who is my sponsor?" — keyed by the **beneficiary** so the
         * TransactionExtension can answer in a single storage read per tx.
         */
        SponsorOf: StorageDescriptor<[Key: SS58String], SS58String, true, never>;
        /**
         * Per-sponsor pot balance. Mirrored separately from the signer's
         * free balance so we can show a dedicated "sponsorship budget" in
         * the UI and enforce a minimum-funded threshold.
         */
        SponsorPots: StorageDescriptor<[Key: SS58String], bigint, false, never>;
        /**
         * Running count of beneficiaries per sponsor. Only used by the UI —
         * neither the extension nor the extrinsics rely on it, so it is kept
         * out of the hot path.
         */
        BeneficiaryCount: StorageDescriptor<[Key: SS58String], number, false, never>;
    };
};
type ICalls = {
    System: {
        /**
         * Make some on-chain remark.
         *
         * Can be executed by every `origin`.
         */
        remark: TxDescriptor<Anonymize<I8ofcg5rbj0g2c>>;
        /**
         * Set the number of pages in the WebAssembly environment's heap.
         */
        set_heap_pages: TxDescriptor<Anonymize<I4adgbll7gku4i>>;
        /**
         * Set the new runtime code.
         */
        set_code: TxDescriptor<Anonymize<I6pjjpfvhvcfru>>;
        /**
         * Set the new runtime code without doing any checks of the given `code`.
         *
         * Note that runtime upgrades will not run if this is called with a not-increasing spec
         * version!
         */
        set_code_without_checks: TxDescriptor<Anonymize<I6pjjpfvhvcfru>>;
        /**
         * Set some items of storage.
         */
        set_storage: TxDescriptor<Anonymize<I9pj91mj79qekl>>;
        /**
         * Kill some items from storage.
         */
        kill_storage: TxDescriptor<Anonymize<I39uah9nss64h9>>;
        /**
         * Kill all storage items with a key that starts with the given prefix.
         *
         * **NOTE:** We rely on the Root origin to provide us the number of subkeys under
         * the prefix we are removing to accurately calculate the weight of this function.
         */
        kill_prefix: TxDescriptor<Anonymize<Ik64dknsq7k08>>;
        /**
         * Make some on-chain remark and emit event.
         */
        remark_with_event: TxDescriptor<Anonymize<I8ofcg5rbj0g2c>>;
        /**
         * Authorize an upgrade to a given `code_hash` for the runtime. The runtime can be supplied
         * later.
         *
         * This call requires Root origin.
         */
        authorize_upgrade: TxDescriptor<Anonymize<Ib51vk42m1po4n>>;
        /**
         * Authorize an upgrade to a given `code_hash` for the runtime. The runtime can be supplied
         * later.
         *
         * WARNING: This authorizes an upgrade that will take place without any safety checks, for
         * example that the spec name remains the same and that the version number increases. Not
         * recommended for normal use. Use `authorize_upgrade` instead.
         *
         * This call requires Root origin.
         */
        authorize_upgrade_without_checks: TxDescriptor<Anonymize<Ib51vk42m1po4n>>;
        /**
         * Provide the preimage (runtime binary) `code` for an upgrade that has been authorized.
         *
         * If the authorization required a version check, this call will ensure the spec name
         * remains unchanged and that the spec version has increased.
         *
         * Depending on the runtime's `OnSetCode` configuration, this function may directly apply
         * the new `code` in the same block or attempt to schedule the upgrade.
         *
         * All origins are allowed.
         */
        apply_authorized_upgrade: TxDescriptor<Anonymize<I6pjjpfvhvcfru>>;
    };
    ParachainSystem: {
        /**
         * Set the current validation data.
         *
         * This should be invoked exactly once per block. It will panic at the finalization
         * phase if the call was not invoked.
         *
         * The dispatch origin for this call must be `Inherent`
         *
         * As a side effect, this function upgrades the current validation function
         * if the appropriate time has come.
         */
        set_validation_data: TxDescriptor<Anonymize<Ial23jn8hp0aen>>;
        /**
        
         */
        sudo_send_upward_message: TxDescriptor<Anonymize<Ifpj261e8s63m3>>;
    };
    Timestamp: {
        /**
         * Set the current time.
         *
         * This call should be invoked exactly once per block. It will panic at the finalization
         * phase, if this call hasn't been invoked by that time.
         *
         * The timestamp should be greater than the previous one by the amount specified by
         * [`Config::MinimumPeriod`].
         *
         * The dispatch origin for this call must be _None_.
         *
         * This dispatch class is _Mandatory_ to ensure it gets executed in the block. Be aware
         * that changing the complexity of this call could result exhausting the resources in a
         * block to execute any other calls.
         *
         * ## Complexity
         * - `O(1)` (Note that implementations of `OnTimestampSet` must also be `O(1)`)
         * - 1 storage read and 1 storage mutation (codec `O(1)` because of `DidUpdate::take` in
         * `on_finalize`)
         * - 1 event handler `on_timestamp_set`. Must be `O(1)`.
         */
        set: TxDescriptor<Anonymize<Idcr6u6361oad9>>;
    };
    Balances: {
        /**
         * Transfer some liquid free balance to another account.
         *
         * `transfer_allow_death` will set the `FreeBalance` of the sender and receiver.
         * If the sender's account is below the existential deposit as a result
         * of the transfer, the account will be reaped.
         *
         * The dispatch origin for this call must be `Signed` by the transactor.
         */
        transfer_allow_death: TxDescriptor<Anonymize<I4ktuaksf5i1gk>>;
        /**
         * Exactly as `transfer_allow_death`, except the origin must be root and the source account
         * may be specified.
         */
        force_transfer: TxDescriptor<Anonymize<I9bqtpv2ii35mp>>;
        /**
         * Same as the [`transfer_allow_death`] call, but with a check that the transfer will not
         * kill the origin account.
         *
         * 99% of the time you want [`transfer_allow_death`] instead.
         *
         * [`transfer_allow_death`]: struct.Pallet.html#method.transfer
         */
        transfer_keep_alive: TxDescriptor<Anonymize<I4ktuaksf5i1gk>>;
        /**
         * Transfer the entire transferable balance from the caller account.
         *
         * NOTE: This function only attempts to transfer _transferable_ balances. This means that
         * any locked, reserved, or existential deposits (when `keep_alive` is `true`), will not be
         * transferred by this function. To ensure that this function results in a killed account,
         * you might need to prepare the account by removing any reference counters, storage
         * deposits, etc...
         *
         * The dispatch origin of this call must be Signed.
         *
         * - `dest`: The recipient of the transfer.
         * - `keep_alive`: A boolean to determine if the `transfer_all` operation should send all
         * of the funds the account has, causing the sender account to be killed (false), or
         * transfer everything except at least the existential deposit, which will guarantee to
         * keep the sender account alive (true).
         */
        transfer_all: TxDescriptor<Anonymize<I9j7pagd6d4bda>>;
        /**
         * Unreserve some balance from a user by force.
         *
         * Can only be called by ROOT.
         */
        force_unreserve: TxDescriptor<Anonymize<I2h9pmio37r7fb>>;
        /**
         * Upgrade a specified account.
         *
         * - `origin`: Must be `Signed`.
         * - `who`: The account to be upgraded.
         *
         * This will waive the transaction fee if at least all but 10% of the accounts needed to
         * be upgraded. (We let some not have to be upgraded just in order to allow for the
         * possibility of churn).
         */
        upgrade_accounts: TxDescriptor<Anonymize<Ibmr18suc9ikh9>>;
        /**
         * Set the regular balance of a given account.
         *
         * The dispatch origin for this call is `root`.
         */
        force_set_balance: TxDescriptor<Anonymize<I9iq22t0burs89>>;
        /**
         * Adjust the total issuance in a saturating way.
         *
         * Can only be called by root and always needs a positive `delta`.
         *
         * # Example
         */
        force_adjust_total_issuance: TxDescriptor<Anonymize<I5u8olqbbvfnvf>>;
        /**
         * Burn the specified liquid free balance from the origin account.
         *
         * If the origin's account ends up below the existential deposit as a result
         * of the burn and `keep_alive` is false, the account will be reaped.
         *
         * Unlike sending funds to a _burn_ address, which merely makes the funds inaccessible,
         * this `burn` operation will reduce total issuance by the amount _burned_.
         */
        burn: TxDescriptor<Anonymize<I5utcetro501ir>>;
    };
    Sudo: {
        /**
         * Authenticates the sudo key and dispatches a function call with `Root` origin.
         */
        sudo: TxDescriptor<Anonymize<I2i50r8rcfts3l>>;
        /**
         * Authenticates the sudo key and dispatches a function call with `Root` origin.
         * This function does not check the weight of the call, and instead allows the
         * Sudo user to specify the weight of the call.
         *
         * The dispatch origin for this call must be _Signed_.
         */
        sudo_unchecked_weight: TxDescriptor<Anonymize<Idlcrgc3dl5usf>>;
        /**
         * Authenticates the current sudo key and sets the given AccountId (`new`) as the new sudo
         * key.
         */
        set_key: TxDescriptor<Anonymize<I8k3rnvpeeh4hv>>;
        /**
         * Authenticates the sudo key and dispatches a function call with `Signed` origin from
         * a given account.
         *
         * The dispatch origin for this call must be _Signed_.
         */
        sudo_as: TxDescriptor<Anonymize<I2am3fetaem2gu>>;
        /**
         * Permanently removes the sudo key.
         *
         * **This cannot be un-done.**
         */
        remove_key: TxDescriptor<undefined>;
    };
    CollatorSelection: {
        /**
         * Set the list of invulnerable (fixed) collators. These collators must do some
         * preparation, namely to have registered session keys.
         *
         * The call will remove any accounts that have not registered keys from the set. That is,
         * it is non-atomic; the caller accepts all `AccountId`s passed in `new` _individually_ as
         * acceptable Invulnerables, and is not proposing a _set_ of new Invulnerables.
         *
         * This call does not maintain mutual exclusivity of `Invulnerables` and `Candidates`. It
         * is recommended to use a batch of `add_invulnerable` and `remove_invulnerable` instead. A
         * `batch_all` can also be used to enforce atomicity. If any candidates are included in
         * `new`, they should be removed with `remove_invulnerable_candidate` after execution.
         *
         * Must be called by the `UpdateOrigin`.
         */
        set_invulnerables: TxDescriptor<Anonymize<Ifccifqltb5obi>>;
        /**
         * Set the ideal number of non-invulnerable collators. If lowering this number, then the
         * number of running collators could be higher than this figure. Aside from that edge case,
         * there should be no other way to have more candidates than the desired number.
         *
         * The origin for this call must be the `UpdateOrigin`.
         */
        set_desired_candidates: TxDescriptor<Anonymize<Iadtsfv699cq8b>>;
        /**
         * Set the candidacy bond amount.
         *
         * If the candidacy bond is increased by this call, all current candidates which have a
         * deposit lower than the new bond will be kicked from the list and get their deposits
         * back.
         *
         * The origin for this call must be the `UpdateOrigin`.
         */
        set_candidacy_bond: TxDescriptor<Anonymize<Ialpmgmhr3gk5r>>;
        /**
         * Register this account as a collator candidate. The account must (a) already have
         * registered session keys and (b) be able to reserve the `CandidacyBond`.
         *
         * This call is not available to `Invulnerable` collators.
         */
        register_as_candidate: TxDescriptor<undefined>;
        /**
         * Deregister `origin` as a collator candidate. Note that the collator can only leave on
         * session change. The `CandidacyBond` will be unreserved immediately.
         *
         * This call will fail if the total number of candidates would drop below
         * `MinEligibleCollators`.
         */
        leave_intent: TxDescriptor<undefined>;
        /**
         * Add a new account `who` to the list of `Invulnerables` collators. `who` must have
         * registered session keys. If `who` is a candidate, they will be removed.
         *
         * The origin for this call must be the `UpdateOrigin`.
         */
        add_invulnerable: TxDescriptor<Anonymize<I4cbvqmqadhrea>>;
        /**
         * Remove an account `who` from the list of `Invulnerables` collators. `Invulnerables` must
         * be sorted.
         *
         * The origin for this call must be the `UpdateOrigin`.
         */
        remove_invulnerable: TxDescriptor<Anonymize<I4cbvqmqadhrea>>;
        /**
         * Update the candidacy bond of collator candidate `origin` to a new amount `new_deposit`.
         *
         * Setting a `new_deposit` that is lower than the current deposit while `origin` is
         * occupying a top-`DesiredCandidates` slot is not allowed.
         *
         * This call will fail if `origin` is not a collator candidate, the updated bond is lower
         * than the minimum candidacy bond, and/or the amount cannot be reserved.
         */
        update_bond: TxDescriptor<Anonymize<I3sdol54kg5jaq>>;
        /**
         * The caller `origin` replaces a candidate `target` in the collator candidate list by
         * reserving `deposit`. The amount `deposit` reserved by the caller must be greater than
         * the existing bond of the target it is trying to replace.
         *
         * This call will fail if the caller is already a collator candidate or invulnerable, the
         * caller does not have registered session keys, the target is not a collator candidate,
         * and/or the `deposit` amount cannot be reserved.
         */
        take_candidate_slot: TxDescriptor<Anonymize<I8fougodaj6di6>>;
    };
    Session: {
        /**
         * Sets the session key(s) of the function caller to `keys`.
         * Allows an account to set its session key prior to becoming a validator.
         * This doesn't take effect until the next session.
         *
         * The dispatch origin of this function must be signed.
         *
         * ## Complexity
         * - `O(1)`. Actual cost depends on the number of length of `T::Keys::key_ids()` which is
         * fixed.
         */
        set_keys: TxDescriptor<Anonymize<I81vt5eq60l4b6>>;
        /**
         * Removes any session key(s) of the function caller.
         *
         * This doesn't take effect until the next session.
         *
         * The dispatch origin of this function must be Signed and the account must be either be
         * convertible to a validator ID using the chain's typical addressing system (this usually
         * means being a controller account) or directly convertible into a validator ID (which
         * usually means being a stash account).
         *
         * ## Complexity
         * - `O(1)` in number of key types. Actual cost depends on the number of length of
         * `T::Keys::key_ids()` which is fixed.
         */
        purge_keys: TxDescriptor<undefined>;
    };
    XcmpQueue: {
        /**
         * Suspends all XCM executions for the XCMP queue, regardless of the sender's origin.
         *
         * - `origin`: Must pass `ControllerOrigin`.
         */
        suspend_xcm_execution: TxDescriptor<undefined>;
        /**
         * Resumes all XCM executions for the XCMP queue.
         *
         * Note that this function doesn't change the status of the in/out bound channels.
         *
         * - `origin`: Must pass `ControllerOrigin`.
         */
        resume_xcm_execution: TxDescriptor<undefined>;
        /**
         * Overwrites the number of pages which must be in the queue for the other side to be
         * told to suspend their sending.
         *
         * - `origin`: Must pass `Root`.
         * - `new`: Desired value for `QueueConfigData.suspend_value`
         */
        update_suspend_threshold: TxDescriptor<Anonymize<I3vh014cqgmrfd>>;
        /**
         * Overwrites the number of pages which must be in the queue after which we drop any
         * further messages from the channel.
         *
         * - `origin`: Must pass `Root`.
         * - `new`: Desired value for `QueueConfigData.drop_threshold`
         */
        update_drop_threshold: TxDescriptor<Anonymize<I3vh014cqgmrfd>>;
        /**
         * Overwrites the number of pages which the queue must be reduced to before it signals
         * that message sending may recommence after it has been suspended.
         *
         * - `origin`: Must pass `Root`.
         * - `new`: Desired value for `QueueConfigData.resume_threshold`
         */
        update_resume_threshold: TxDescriptor<Anonymize<I3vh014cqgmrfd>>;
    };
    PolkadotXcm: {
        /**
        
         */
        send: TxDescriptor<Anonymize<Ia5cotcvi888ln>>;
        /**
         * Teleport some assets from the local chain to some destination chain.
         *
         * **This function is deprecated: Use `limited_teleport_assets` instead.**
         *
         * Fee payment on the destination side is made from the asset in the `assets` vector of
         * index `fee_asset_item`. The weight limit for fees is not provided and thus is unlimited,
         * with all fees taken as needed from the asset.
         *
         * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
         * - `dest`: Destination context for the assets. Will typically be `[Parent,
         * Parachain(..)]` to send from parachain to parachain, or `[Parachain(..)]` to send from
         * relay to parachain.
         * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will
         * generally be an `AccountId32` value.
         * - `assets`: The assets to be withdrawn. This should include the assets used to pay the
         * fee on the `dest` chain.
         * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
         * fees.
         */
        teleport_assets: TxDescriptor<Anonymize<I21jsa919m88fd>>;
        /**
         * Transfer some assets from the local chain to the destination chain through their local,
         * destination or remote reserve.
         *
         * `assets` must have same reserve location and may not be teleportable to `dest`.
         * - `assets` have local reserve: transfer assets to sovereign account of destination
         * chain and forward a notification XCM to `dest` to mint and deposit reserve-based
         * assets to `beneficiary`.
         * - `assets` have destination reserve: burn local assets and forward a notification to
         * `dest` chain to withdraw the reserve assets from this chain's sovereign account and
         * deposit them to `beneficiary`.
         * - `assets` have remote reserve: burn local assets, forward XCM to reserve chain to move
         * reserves from this chain's SA to `dest` chain's SA, and forward another XCM to `dest`
         * to mint and deposit reserve-based assets to `beneficiary`.
         *
         * **This function is deprecated: Use `limited_reserve_transfer_assets` instead.**
         *
         * Fee payment on the destination side is made from the asset in the `assets` vector of
         * index `fee_asset_item`. The weight limit for fees is not provided and thus is unlimited,
         * with all fees taken as needed from the asset.
         *
         * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
         * - `dest`: Destination context for the assets. Will typically be `[Parent,
         * Parachain(..)]` to send from parachain to parachain, or `[Parachain(..)]` to send from
         * relay to parachain.
         * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will
         * generally be an `AccountId32` value.
         * - `assets`: The assets to be withdrawn. This should include the assets used to pay the
         * fee on the `dest` (and possibly reserve) chains.
         * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
         * fees.
         */
        reserve_transfer_assets: TxDescriptor<Anonymize<I21jsa919m88fd>>;
        /**
         * Execute an XCM message from a local, signed, origin.
         *
         * An event is deposited indicating whether `msg` could be executed completely or only
         * partially.
         *
         * No more than `max_weight` will be used in its attempted execution. If this is less than
         * the maximum amount of weight that the message could take to be executed, then no
         * execution attempt will be made.
         */
        execute: TxDescriptor<Anonymize<Iegif7m3upfe1k>>;
        /**
         * Extoll that a particular destination can be communicated with through a particular
         * version of XCM.
         *
         * - `origin`: Must be an origin specified by AdminOrigin.
         * - `location`: The destination that is being described.
         * - `xcm_version`: The latest version of XCM that `location` supports.
         */
        force_xcm_version: TxDescriptor<Anonymize<I9kt8c221c83ln>>;
        /**
         * Set a safe XCM version (the version that XCM should be encoded with if the most recent
         * version a destination can accept is unknown).
         *
         * - `origin`: Must be an origin specified by AdminOrigin.
         * - `maybe_xcm_version`: The default XCM encoding version, or `None` to disable.
         */
        force_default_xcm_version: TxDescriptor<Anonymize<Ic76kfh5ebqkpl>>;
        /**
         * Ask a location to notify us regarding their XCM version and any changes to it.
         *
         * - `origin`: Must be an origin specified by AdminOrigin.
         * - `location`: The location to which we should subscribe for XCM version notifications.
         */
        force_subscribe_version_notify: TxDescriptor<Anonymize<Icscpmubum33bq>>;
        /**
         * Require that a particular destination should no longer notify us regarding any XCM
         * version changes.
         *
         * - `origin`: Must be an origin specified by AdminOrigin.
         * - `location`: The location to which we are currently subscribed for XCM version
         * notifications which we no longer desire.
         */
        force_unsubscribe_version_notify: TxDescriptor<Anonymize<Icscpmubum33bq>>;
        /**
         * Transfer some assets from the local chain to the destination chain through their local,
         * destination or remote reserve.
         *
         * `assets` must have same reserve location and may not be teleportable to `dest`.
         * - `assets` have local reserve: transfer assets to sovereign account of destination
         * chain and forward a notification XCM to `dest` to mint and deposit reserve-based
         * assets to `beneficiary`.
         * - `assets` have destination reserve: burn local assets and forward a notification to
         * `dest` chain to withdraw the reserve assets from this chain's sovereign account and
         * deposit them to `beneficiary`.
         * - `assets` have remote reserve: burn local assets, forward XCM to reserve chain to move
         * reserves from this chain's SA to `dest` chain's SA, and forward another XCM to `dest`
         * to mint and deposit reserve-based assets to `beneficiary`.
         *
         * Fee payment on the destination side is made from the asset in the `assets` vector of
         * index `fee_asset_item`, up to enough to pay for `weight_limit` of weight. If more weight
         * is needed than `weight_limit`, then the operation will fail and the sent assets may be
         * at risk.
         *
         * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
         * - `dest`: Destination context for the assets. Will typically be `[Parent,
         * Parachain(..)]` to send from parachain to parachain, or `[Parachain(..)]` to send from
         * relay to parachain.
         * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will
         * generally be an `AccountId32` value.
         * - `assets`: The assets to be withdrawn. This should include the assets used to pay the
         * fee on the `dest` (and possibly reserve) chains.
         * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
         * fees.
         * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
         */
        limited_reserve_transfer_assets: TxDescriptor<Anonymize<I21d2olof7eb60>>;
        /**
         * Teleport some assets from the local chain to some destination chain.
         *
         * Fee payment on the destination side is made from the asset in the `assets` vector of
         * index `fee_asset_item`, up to enough to pay for `weight_limit` of weight. If more weight
         * is needed than `weight_limit`, then the operation will fail and the sent assets may be
         * at risk.
         *
         * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
         * - `dest`: Destination context for the assets. Will typically be `[Parent,
         * Parachain(..)]` to send from parachain to parachain, or `[Parachain(..)]` to send from
         * relay to parachain.
         * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will
         * generally be an `AccountId32` value.
         * - `assets`: The assets to be withdrawn. This should include the assets used to pay the
         * fee on the `dest` chain.
         * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
         * fees.
         * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
         */
        limited_teleport_assets: TxDescriptor<Anonymize<I21d2olof7eb60>>;
        /**
         * Set or unset the global suspension state of the XCM executor.
         *
         * - `origin`: Must be an origin specified by AdminOrigin.
         * - `suspended`: `true` to suspend, `false` to resume.
         */
        force_suspension: TxDescriptor<Anonymize<Ibgm4rnf22lal1>>;
        /**
         * Transfer some assets from the local chain to the destination chain through their local,
         * destination or remote reserve, or through teleports.
         *
         * Fee payment on the destination side is made from the asset in the `assets` vector of
         * index `fee_asset_item` (hence referred to as `fees`), up to enough to pay for
         * `weight_limit` of weight. If more weight is needed than `weight_limit`, then the
         * operation will fail and the sent assets may be at risk.
         *
         * `assets` (excluding `fees`) must have same reserve location or otherwise be teleportable
         * to `dest`, no limitations imposed on `fees`.
         * - for local reserve: transfer assets to sovereign account of destination chain and
         * forward a notification XCM to `dest` to mint and deposit reserve-based assets to
         * `beneficiary`.
         * - for destination reserve: burn local assets and forward a notification to `dest` chain
         * to withdraw the reserve assets from this chain's sovereign account and deposit them
         * to `beneficiary`.
         * - for remote reserve: burn local assets, forward XCM to reserve chain to move reserves
         * from this chain's SA to `dest` chain's SA, and forward another XCM to `dest` to mint
         * and deposit reserve-based assets to `beneficiary`.
         * - for teleports: burn local assets and forward XCM to `dest` chain to mint/teleport
         * assets and deposit them to `beneficiary`.
         *
         * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
         * - `dest`: Destination context for the assets. Will typically be `X2(Parent,
         * Parachain(..))` to send from parachain to parachain, or `X1(Parachain(..))` to send
         * from relay to parachain.
         * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will
         * generally be an `AccountId32` value.
         * - `assets`: The assets to be withdrawn. This should include the assets used to pay the
         * fee on the `dest` (and possibly reserve) chains.
         * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
         * fees.
         * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
         */
        transfer_assets: TxDescriptor<Anonymize<I21d2olof7eb60>>;
        /**
         * Claims assets trapped on this pallet because of leftover assets during XCM execution.
         *
         * - `origin`: Anyone can call this extrinsic.
         * - `assets`: The exact assets that were trapped. Use the version to specify what version
         * was the latest when they were trapped.
         * - `beneficiary`: The location/account where the claimed assets will be deposited.
         */
        claim_assets: TxDescriptor<Anonymize<Ie68np0vpihith>>;
        /**
         * Transfer assets from the local chain to the destination chain using explicit transfer
         * types for assets and fees.
         *
         * `assets` must have same reserve location or may be teleportable to `dest`. Caller must
         * provide the `assets_transfer_type` to be used for `assets`:
         * - `TransferType::LocalReserve`: transfer assets to sovereign account of destination
         * chain and forward a notification XCM to `dest` to mint and deposit reserve-based
         * assets to `beneficiary`.
         * - `TransferType::DestinationReserve`: burn local assets and forward a notification to
         * `dest` chain to withdraw the reserve assets from this chain's sovereign account and
         * deposit them to `beneficiary`.
         * - `TransferType::RemoteReserve(reserve)`: burn local assets, forward XCM to `reserve`
         * chain to move reserves from this chain's SA to `dest` chain's SA, and forward another
         * XCM to `dest` to mint and deposit reserve-based assets to `beneficiary`. Typically
         * the remote `reserve` is Asset Hub.
         * - `TransferType::Teleport`: burn local assets and forward XCM to `dest` chain to
         * mint/teleport assets and deposit them to `beneficiary`.
         *
         * On the destination chain, as well as any intermediary hops, `BuyExecution` is used to
         * buy execution using transferred `assets` identified by `remote_fees_id`.
         * Make sure enough of the specified `remote_fees_id` asset is included in the given list
         * of `assets`. `remote_fees_id` should be enough to pay for `weight_limit`. If more weight
         * is needed than `weight_limit`, then the operation will fail and the sent assets may be
         * at risk.
         *
         * `remote_fees_id` may use different transfer type than rest of `assets` and can be
         * specified through `fees_transfer_type`.
         *
         * The caller needs to specify what should happen to the transferred assets once they reach
         * the `dest` chain. This is done through the `custom_xcm_on_dest` parameter, which
         * contains the instructions to execute on `dest` as a final step.
         * This is usually as simple as:
         * `Xcm(vec![DepositAsset { assets: Wild(AllCounted(assets.len())), beneficiary }])`,
         * but could be something more exotic like sending the `assets` even further.
         *
         * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
         * - `dest`: Destination context for the assets. Will typically be `[Parent,
         * Parachain(..)]` to send from parachain to parachain, or `[Parachain(..)]` to send from
         * relay to parachain, or `(parents: 2, (GlobalConsensus(..), ..))` to send from
         * parachain across a bridge to another ecosystem destination.
         * - `assets`: The assets to be withdrawn. This should include the assets used to pay the
         * fee on the `dest` (and possibly reserve) chains.
         * - `assets_transfer_type`: The XCM `TransferType` used to transfer the `assets`.
         * - `remote_fees_id`: One of the included `assets` to be used to pay fees.
         * - `fees_transfer_type`: The XCM `TransferType` used to transfer the `fees` assets.
         * - `custom_xcm_on_dest`: The XCM to be executed on `dest` chain as the last step of the
         * transfer, which also determines what happens to the assets on the destination chain.
         * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
         */
        transfer_assets_using_type_and_then: TxDescriptor<Anonymize<I9bnv6lu0crf1q>>;
        /**
         * Authorize another `aliaser` location to alias into the local `origin` making this call.
         * The `aliaser` is only authorized until the provided `expiry` block number.
         * The call can also be used for a previously authorized alias in order to update its
         * `expiry` block number.
         *
         * Usually useful to allow your local account to be aliased into from a remote location
         * also under your control (like your account on another chain).
         *
         * WARNING: make sure the caller `origin` (you) trusts the `aliaser` location to act in
         * their/your name. Once authorized using this call, the `aliaser` can freely impersonate
         * `origin` in XCM programs executed on the local chain.
         */
        add_authorized_alias: TxDescriptor<Anonymize<Iauhjqifrdklq7>>;
        /**
         * Remove a previously authorized `aliaser` from the list of locations that can alias into
         * the local `origin` making this call.
         */
        remove_authorized_alias: TxDescriptor<Anonymize<Ie1uso9m8rt5cf>>;
        /**
         * Remove all previously authorized `aliaser`s that can alias into the local `origin`
         * making this call.
         */
        remove_all_authorized_aliases: TxDescriptor<undefined>;
    };
    MessageQueue: {
        /**
         * Remove a page which has no more messages remaining to be processed or is stale.
         */
        reap_page: TxDescriptor<Anonymize<I40pqum1mu8qg3>>;
        /**
         * Execute an overweight message.
         *
         * Temporary processing errors will be propagated whereas permanent errors are treated
         * as success condition.
         *
         * - `origin`: Must be `Signed`.
         * - `message_origin`: The origin from which the message to be executed arrived.
         * - `page`: The page in the queue in which the message to be executed is sitting.
         * - `index`: The index into the queue of the message to be executed.
         * - `weight_limit`: The maximum amount of weight allowed to be consumed in the execution
         * of the message.
         *
         * Benchmark complexity considerations: O(index + weight_limit).
         */
        execute_overweight: TxDescriptor<Anonymize<I1r4c2ghbtvjuc>>;
    };
    TemplatePallet: {
        /**
         * Create a new proof-of-existence claim for the given hash.
         *
         * The hash must not already be claimed. The caller becomes the owner,
         * and the current block number is recorded.
         */
        create_claim: TxDescriptor<Anonymize<I1jm8m1rh9e20v>>;
        /**
         * Revoke an existing proof-of-existence claim.
         *
         * Only the original claim owner can revoke it. The storage entry is removed.
         */
        revoke_claim: TxDescriptor<Anonymize<I1jm8m1rh9e20v>>;
    };
    SocialAppRegistry: {
        /**
         * Register a new social app.
         *
         * Validates capacity and balance before making any state changes.
         * Reserves `T::AppBond`, assigns the next available AppId, stores the
         * app record, and updates the owner's app list.
         */
        register_app: TxDescriptor<Anonymize<I7fv0kt52b21r5>>;
        /**
         * Deregister an existing app.
         *
         * Sets the app status to `Inactive`, unreserves the bond, and removes
         * the app from the owner's index. The app record is kept for history.
         */
        deregister_app: TxDescriptor<Anonymize<I7uphs141r660c>>;
        /**
         * Dispatch `call` under an [`Origin::AppModerator`] so that
         * downstream pallets can gate moderation-only extrinsics on the
         * `EnsureAppModerator` guard.
         *
         * The caller must be the registered owner of `app_id`. The
         * inner call's weight is added to the base weight so the fee
         * reflects the full amount of work.
         */
        act_as_moderator: TxDescriptor<Anonymize<I8pgovs95pnrrd>>;
    };
    SocialProfiles: {
        /**
         * Create a new profile for the caller.
         */
        create_profile: TxDescriptor<Anonymize<I4k7i1bf6cpso8>>;
        /**
         * Update the metadata CID of an existing profile.
         */
        update_metadata: TxDescriptor<Anonymize<I5vanth86cd3mt>>;
        /**
         * Delete the caller's profile.
         */
        delete_profile: TxDescriptor<undefined>;
        /**
         * Set the follow fee for the caller's profile.
         * Anyone who wants to follow this account must pay this fee.
         * Set to 0 for free follows.
         */
        set_follow_fee: TxDescriptor<Anonymize<Ib1ilbm5ipoh62>>;
    };
    SocialGraph: {
        /**
         * Follow another user.
         *
         * Both accounts must have profiles. The follow fee is determined by the
         * target's profile (set via `set_follow_fee` in pallet-social-profiles).
         * If the fee is 0, the follow is free.
         */
        follow: TxDescriptor<Anonymize<I14p0q0qs0fqbj>>;
        /**
         * Unfollow a user. No refund.
         */
        unfollow: TxDescriptor<Anonymize<I14p0q0qs0fqbj>>;
    };
    SocialFeeds: {
        /**
         * Create a new original post.
         *
         * `visibility`: Public, Obfuscated, or Private.
         * `unlock_fee`: fee to unlock content (only for Obfuscated/Private, ignored for Public).
         */
        create_post: TxDescriptor<Anonymize<Iejaamcnc7tiq6>>;
        /**
         * Create a reply to an existing post.
         *
         * Replies are always public with visibility Public.
         */
        create_reply: TxDescriptor<Anonymize<I9lv278elt0l38>>;
        /**
         * Unlock a non-public post.
         *
         * The viewer pays `unlock_fee` to the author and registers an
         * ephemeral X25519 public key. Payment alone does not hand over
         * the content key: the pallet enqueues an [`UnlockRecord`] with
         * `wrapped_key = None`, and the collator's offchain worker
         * eventually re-seals the content key to `buyer_pk` and submits
         * `deliver_unlock_unsigned`. The viewer polls until
         * `wrapped_key.is_some()` and then decrypts locally.
         *
         * The author keeps implicit access — if the caller is the
         * author, we short-circuit without creating an unlock record.
         */
        unlock_post: TxDescriptor<Anonymize<I54i58ksnkqnaq>>;
        /**
         * Admin entry point to publish / rotate the key service (the
         * custodial collator's X25519 pk + signer account).
         */
        set_key_service: TxDescriptor<Anonymize<I8qvsahrnac2tn>>;
        /**
         * Unsigned extrinsic submitted by the collator OCW to hand a
         * re-sealed content key to the viewer. See the `validate_unsigned`
         * block for the pool-level validation rules.
         */
        deliver_unlock_unsigned: TxDescriptor<Anonymize<I62qodqf8oaocv>>;
        /**
         * Redact a post from an app. The dispatch is gated by
         * `T::ModerationOrigin`, which in the runtime is wired to
         * `EnsureAppModerator` — the guard yields `(app_id, moderator)`
         * and we verify the post actually belongs to that app before
         * applying the state change.
         *
         * This is the primary demonstration of `#[pallet::origin]` in
         * this runtime: authority (`moderator` can redact posts in
         * `app_id`) is carried in the origin itself, so this extrinsic
         * can trust the guard without any re-lookup into the app
         * registry.
         */
        redact_post: TxDescriptor<Anonymize<Ia6ds36j6alqgf>>;
    };
    Identity: {
        /**
         * Add a registrar to the system.
         *
         * The dispatch origin for this call must be `T::RegistrarOrigin`.
         *
         * - `account`: the account of the registrar.
         *
         * Emits `RegistrarAdded` if successful.
         */
        add_registrar: TxDescriptor<Anonymize<Ic6cqd9g0t65v0>>;
        /**
         * Set an account's identity information and reserve the appropriate deposit.
         *
         * If the account already has identity information, the deposit is taken as part payment
         * for the new deposit.
         *
         * The dispatch origin for this call must be _Signed_.
         *
         * - `info`: The identity information.
         *
         * Emits `IdentitySet` if successful.
         */
        set_identity: TxDescriptor<Anonymize<I2kds5jji7slh8>>;
        /**
         * Set the sub-accounts of the sender.
         *
         * Payment: Any aggregate balance reserved by previous `set_subs` calls will be returned
         * and an amount `SubAccountDeposit` will be reserved for each item in `subs`.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a registered
         * identity.
         *
         * - `subs`: The identity's (new) sub-accounts.
         */
        set_subs: TxDescriptor<Anonymize<Ia9mkdf6l44shb>>;
        /**
         * Clear an account's identity info and all sub-accounts and return all deposits.
         *
         * Payment: All reserved balances on the account are returned.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a registered
         * identity.
         *
         * Emits `IdentityCleared` if successful.
         */
        clear_identity: TxDescriptor<undefined>;
        /**
         * Request a judgement from a registrar.
         *
         * Payment: At most `max_fee` will be reserved for payment to the registrar if judgement
         * given.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a
         * registered identity.
         *
         * - `reg_index`: The index of the registrar whose judgement is requested.
         * - `max_fee`: The maximum fee that may be paid. This should just be auto-populated as:
         *
         * ```nocompile
         * Registrars::<T>::get().get(reg_index).unwrap().fee
         * ```
         *
         * Emits `JudgementRequested` if successful.
         */
        request_judgement: TxDescriptor<Anonymize<I9l2s4klu0831o>>;
        /**
         * Cancel a previous request.
         *
         * Payment: A previously reserved deposit is returned on success.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a
         * registered identity.
         *
         * - `reg_index`: The index of the registrar whose judgement is no longer requested.
         *
         * Emits `JudgementUnrequested` if successful.
         */
        cancel_request: TxDescriptor<Anonymize<I2ctrt5nqb8o7c>>;
        /**
         * Set the fee required for a judgement to be requested from a registrar.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must be the account
         * of the registrar whose index is `index`.
         *
         * - `index`: the index of the registrar whose fee is to be set.
         * - `fee`: the new fee.
         */
        set_fee: TxDescriptor<Anonymize<I711qahikocb1c>>;
        /**
         * Change the account associated with a registrar.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must be the account
         * of the registrar whose index is `index`.
         *
         * - `index`: the index of the registrar whose fee is to be set.
         * - `new`: the new account ID.
         */
        set_account_id: TxDescriptor<Anonymize<I6o1er683vod1j>>;
        /**
         * Set the field information for a registrar.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must be the account
         * of the registrar whose index is `index`.
         *
         * - `index`: the index of the registrar whose fee is to be set.
         * - `fields`: the fields that the registrar concerns themselves with.
         */
        set_fields: TxDescriptor<Anonymize<Id6gojh30v9ib2>>;
        /**
         * Provide a judgement for an account's identity.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must be the account
         * of the registrar whose index is `reg_index`.
         *
         * - `reg_index`: the index of the registrar whose judgement is being made.
         * - `target`: the account whose identity the judgement is upon. This must be an account
         * with a registered identity.
         * - `judgement`: the judgement of the registrar of index `reg_index` about `target`.
         * - `identity`: The hash of the [`IdentityInformationProvider`] for that the judgement is
         * provided.
         *
         * Note: Judgements do not apply to a username.
         *
         * Emits `JudgementGiven` if successful.
         */
        provide_judgement: TxDescriptor<Anonymize<Ide1bahhh47lj9>>;
        /**
         * Remove an account's identity and sub-account information and slash the deposits.
         *
         * Payment: Reserved balances from `set_subs` and `set_identity` are slashed and handled by
         * `Slash`. Verification request deposits are not returned; they should be cancelled
         * manually using `cancel_request`.
         *
         * The dispatch origin for this call must match `T::ForceOrigin`.
         *
         * - `target`: the account whose identity the judgement is upon. This must be an account
         * with a registered identity.
         *
         * Emits `IdentityKilled` if successful.
         */
        kill_identity: TxDescriptor<Anonymize<Id9uqtigc0il3v>>;
        /**
         * Add the given account to the sender's subs.
         *
         * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
         * to the sender.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a registered
         * sub identity of `sub`.
         */
        add_sub: TxDescriptor<Anonymize<Ic68lsi7chpv5k>>;
        /**
         * Alter the associated name of the given sub-account.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a registered
         * sub identity of `sub`.
         */
        rename_sub: TxDescriptor<Anonymize<Ic68lsi7chpv5k>>;
        /**
         * Remove the given account from the sender's subs.
         *
         * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
         * to the sender.
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a registered
         * sub identity of `sub`.
         */
        remove_sub: TxDescriptor<Anonymize<Iek0boln8pgnko>>;
        /**
         * Remove the sender as a sub-account.
         *
         * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
         * to the sender (*not* the original depositor).
         *
         * The dispatch origin for this call must be _Signed_ and the sender must have a registered
         * super-identity.
         *
         * NOTE: This should not normally be used, but is provided in the case that the non-
         * controller of an account is maliciously registered as a sub-account.
         */
        quit_sub: TxDescriptor<undefined>;
        /**
         * Add an `AccountId` with permission to grant usernames with a given `suffix` appended.
         *
         * The authority can grant up to `allocation` usernames. To top up the allocation or
         * change the account used to grant usernames, this call can be used with the updated
         * parameters to overwrite the existing configuration.
         */
        add_username_authority: TxDescriptor<Anonymize<I452bkd71b385t>>;
        /**
         * Remove `authority` from the username authorities.
         */
        remove_username_authority: TxDescriptor<Anonymize<Ie83f0p0ke1f4u>>;
        /**
         * Set the username for `who`. Must be called by a username authority.
         *
         * If `use_allocation` is set, the authority must have a username allocation available to
         * spend. Otherwise, the authority will need to put up a deposit for registering the
         * username.
         *
         * Users can either pre-sign their usernames or
         * accept them later.
         *
         * Usernames must:
         * - Only contain lowercase ASCII characters or digits.
         * - When combined with the suffix of the issuing authority be _less than_ the
         * `MaxUsernameLength`.
         */
        set_username_for: TxDescriptor<Anonymize<Ib9nmpn9ru9aeh>>;
        /**
         * Accept a given username that an `authority` granted. The call must include the full
         * username, as in `username.suffix`.
         */
        accept_username: TxDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * Remove an expired username approval. The username was approved by an authority but never
         * accepted by the user and must now be beyond its expiration. The call must include the
         * full username, as in `username.suffix`.
         */
        remove_expired_approval: TxDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * Set a given username as the primary. The username should include the suffix.
         */
        set_primary_username: TxDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * Start the process of removing a username by placing it in the unbinding usernames map.
         * Once the grace period has passed, the username can be deleted by calling
         * [remove_username](crate::Call::remove_username).
         */
        unbind_username: TxDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * Permanently delete a username which has been unbinding for longer than the grace period.
         * Caller is refunded the fee if the username expired and the removal was successful.
         */
        remove_username: TxDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * Call with [ForceOrigin](crate::Config::ForceOrigin) privileges which deletes a username
         * and slashes any deposit associated with it.
         */
        kill_username: TxDescriptor<Anonymize<Ie5l999tf7t2te>>;
    };
    SocialManagers: {
        /**
         * Authorize `manager` to act on the caller's behalf under `scopes`.
         *
         * The caller is the profile owner. A flat deposit of
         * [`Config::ManagerDepositBase`] is reserved on the owner and
         * returned when the manager is removed. An optional `expires_at`
         * block number bounds the authorization in time.
         */
        add_manager: TxDescriptor<Anonymize<I5gn45n88f3ubg>>;
        /**
         * Revoke a single manager. The reserved deposit is released back to
         * the owner in the same block.
         */
        remove_manager: TxDescriptor<Anonymize<I7ujehsqggbv5l>>;
        /**
         * Emergency sweep: wipe every active manager for the caller and
         * release all deposits at once. This is the "lost my keys, someone
         * grab the account" panic button.
         *
         * Bounded by [`Config::MaxManagersPerOwner`], so the worst-case
         * weight is deterministic.
         */
        remove_all_managers: TxDescriptor<undefined>;
        /**
         * Dispatch `call` as if the caller were `owner`, provided the caller
         * is an active manager of `owner` and the call matches one of their
         * authorized scopes.
         *
         * This mirrors `pallet-proxy::proxy`: the inner call is dispatched
         * with `RawOrigin::Signed(owner)` and a dynamic filter installed on
         * the origin enforces scope plus the anti-escalation rules. Downstream
         * pallets see a regular `Signed` origin and require no changes.
         *
         * Weight is charged as `act_as_manager() + inner_call.call_weight`,
         * matching the pattern used by `pallet-proxy` at
         * `substrate/frame/proxy/src/lib.rs:240-262`.
         */
        act_as_manager: TxDescriptor<Anonymize<I3ddb6lhc3jmtj>>;
    };
    Sponsorship: {
        /**
         * Authorise `beneficiary` to have their transaction fees paid
         * from the caller's pot. Overwrites any previous sponsor the
         * beneficiary had.
         */
        register_beneficiary: TxDescriptor<Anonymize<I8ligieds2efci>>;
        /**
         * Revoke a beneficiary. No-op if someone else has since become
         * their sponsor — we only remove the link when it still points at
         * the caller to avoid racy cross-account deregistration.
         */
        revoke_beneficiary: TxDescriptor<Anonymize<I8ligieds2efci>>;
        /**
         * The beneficiary's escape hatch: unilaterally leave the current
         * sponsor. Useful if the sponsor turns hostile (e.g. tries to
         * shape content by threatening to cut them off).
         */
        revoke_my_sponsor: TxDescriptor<undefined>;
        /**
         * Move `amount` from the caller's free balance into their
         * sponsor pot. The pot is tracked separately from the caller's
         * regular balance so withdrawals are explicit.
         */
        top_up: TxDescriptor<Anonymize<I3qt1hgg4djhgb>>;
        /**
         * Take `amount` out of the caller's pot and back into their free
         * balance. Fails if the pot holds less than `amount`.
         */
        withdraw: TxDescriptor<Anonymize<I3qt1hgg4djhgb>>;
    };
};
type IEvent = {
    System: {
        /**
         * An extrinsic completed successfully.
         */
        ExtrinsicSuccess: PlainDescriptor<Anonymize<Ia82mnkmeo2rhc>>;
        /**
         * An extrinsic failed.
         */
        ExtrinsicFailed: PlainDescriptor<Anonymize<Ievs0l5092qcdo>>;
        /**
         * `:code` was updated.
         */
        CodeUpdated: PlainDescriptor<undefined>;
        /**
         * A new account was created.
         */
        NewAccount: PlainDescriptor<Anonymize<Icbccs0ug47ilf>>;
        /**
         * An account was reaped.
         */
        KilledAccount: PlainDescriptor<Anonymize<Icbccs0ug47ilf>>;
        /**
         * On on-chain remark happened.
         */
        Remarked: PlainDescriptor<Anonymize<I855j4i3kr8ko1>>;
        /**
         * An upgrade was authorized.
         */
        UpgradeAuthorized: PlainDescriptor<Anonymize<Ibgl04rn6nbfm6>>;
        /**
         * An invalid authorized upgrade was rejected while trying to apply it.
         */
        RejectedInvalidAuthorizedUpgrade: PlainDescriptor<Anonymize<Ibi6cpipuph58g>>;
    };
    ParachainSystem: {
        /**
         * The validation function has been scheduled to apply.
         */
        ValidationFunctionStored: PlainDescriptor<undefined>;
        /**
         * The validation function was applied as of the contained relay chain block number.
         */
        ValidationFunctionApplied: PlainDescriptor<Anonymize<Idd7hd99u0ho0n>>;
        /**
         * The relay-chain aborted the upgrade process.
         */
        ValidationFunctionDiscarded: PlainDescriptor<undefined>;
        /**
         * Some downward messages have been received and will be processed.
         */
        DownwardMessagesReceived: PlainDescriptor<Anonymize<Iafscmv8tjf0ou>>;
        /**
         * Downward messages were processed using the given weight.
         */
        DownwardMessagesProcessed: PlainDescriptor<Anonymize<I100l07kaehdlp>>;
        /**
         * An upward message was sent to the relay chain.
         */
        UpwardMessageSent: PlainDescriptor<Anonymize<I6gnbnvip5vvdi>>;
    };
    Balances: {
        /**
         * An account was created with some free balance.
         */
        Endowed: PlainDescriptor<Anonymize<Icv68aq8841478>>;
        /**
         * An account was removed whose balance was non-zero but below ExistentialDeposit,
         * resulting in an outright loss.
         */
        DustLost: PlainDescriptor<Anonymize<Ic262ibdoec56a>>;
        /**
         * Transfer succeeded.
         */
        Transfer: PlainDescriptor<Anonymize<Iflcfm9b6nlmdd>>;
        /**
         * A balance was set by root.
         */
        BalanceSet: PlainDescriptor<Anonymize<Ijrsf4mnp3eka>>;
        /**
         * Some balance was reserved (moved from free to reserved).
         */
        Reserved: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some balance was unreserved (moved from reserved to free).
         */
        Unreserved: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some balance was moved from the reserve of the first account to the second account.
         * Final argument indicates the destination balance type.
         */
        ReserveRepatriated: PlainDescriptor<Anonymize<I8tjvj9uq4b7hi>>;
        /**
         * Some amount was deposited (e.g. for transaction fees).
         */
        Deposit: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some amount was withdrawn from the account (e.g. for transaction fees).
         */
        Withdraw: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some amount was removed from the account (e.g. for misbehavior).
         */
        Slashed: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some amount was minted into an account.
         */
        Minted: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some credit was balanced and added to the TotalIssuance.
         */
        MintedCredit: PlainDescriptor<Anonymize<I3qt1hgg4djhgb>>;
        /**
         * Some amount was burned from an account.
         */
        Burned: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some debt has been dropped from the Total Issuance.
         */
        BurnedDebt: PlainDescriptor<Anonymize<I3qt1hgg4djhgb>>;
        /**
         * Some amount was suspended from an account (it can be restored later).
         */
        Suspended: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some amount was restored into an account.
         */
        Restored: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * An account was upgraded.
         */
        Upgraded: PlainDescriptor<Anonymize<I4cbvqmqadhrea>>;
        /**
         * Total issuance was increased by `amount`, creating a credit to be balanced.
         */
        Issued: PlainDescriptor<Anonymize<I3qt1hgg4djhgb>>;
        /**
         * Total issuance was decreased by `amount`, creating a debt to be balanced.
         */
        Rescinded: PlainDescriptor<Anonymize<I3qt1hgg4djhgb>>;
        /**
         * Some balance was locked.
         */
        Locked: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some balance was unlocked.
         */
        Unlocked: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some balance was frozen.
         */
        Frozen: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * Some balance was thawed.
         */
        Thawed: PlainDescriptor<Anonymize<Id5fm4p8lj5qgi>>;
        /**
         * The `TotalIssuance` was forcefully changed.
         */
        TotalIssuanceForced: PlainDescriptor<Anonymize<I4fooe9dun9o0t>>;
        /**
         * Some balance was placed on hold.
         */
        Held: PlainDescriptor<Anonymize<Ipc96b675vau1>>;
        /**
         * Held balance was burned from an account.
         */
        BurnedHeld: PlainDescriptor<Anonymize<Ipc96b675vau1>>;
        /**
         * A transfer of `amount` on hold from `source` to `dest` was initiated.
         */
        TransferOnHold: PlainDescriptor<Anonymize<Ifqi1snmg1eqha>>;
        /**
         * The `transferred` balance is placed on hold at the `dest` account.
         */
        TransferAndHold: PlainDescriptor<Anonymize<I2r55jl5mh3adj>>;
        /**
         * Some balance was released from hold.
         */
        Released: PlainDescriptor<Anonymize<Ipc96b675vau1>>;
        /**
         * An unexpected/defensive event was triggered.
         */
        Unexpected: PlainDescriptor<Anonymize<Iph9c4rn81ub2>>;
    };
    TransactionPayment: {
        /**
         * A transaction fee `actual_fee`, of which `tip` was added to the minimum inclusion fee,
         * has been paid by `who`.
         */
        TransactionFeePaid: PlainDescriptor<Anonymize<Ier2cke86dqbr2>>;
    };
    Sudo: {
        /**
         * A sudo call just took place.
         */
        Sudid: PlainDescriptor<Anonymize<I6pku2di5bd8n3>>;
        /**
         * The sudo key has been updated.
         */
        KeyChanged: PlainDescriptor<Anonymize<I5rtkmhm2dng4u>>;
        /**
         * The key was permanently removed.
         */
        KeyRemoved: PlainDescriptor<undefined>;
        /**
         * A [sudo_as](Pallet::sudo_as) call just took place.
         */
        SudoAsDone: PlainDescriptor<Anonymize<I6pku2di5bd8n3>>;
    };
    CollatorSelection: {
        /**
         * New Invulnerables were set.
         */
        NewInvulnerables: PlainDescriptor<Anonymize<I39t01nnod9109>>;
        /**
         * A new Invulnerable was added.
         */
        InvulnerableAdded: PlainDescriptor<Anonymize<I6v8sm60vvkmk7>>;
        /**
         * An Invulnerable was removed.
         */
        InvulnerableRemoved: PlainDescriptor<Anonymize<I6v8sm60vvkmk7>>;
        /**
         * The number of desired candidates was set.
         */
        NewDesiredCandidates: PlainDescriptor<Anonymize<I1qmtmbe5so8r3>>;
        /**
         * The candidacy bond was set.
         */
        NewCandidacyBond: PlainDescriptor<Anonymize<Ih99m6ehpcar7>>;
        /**
         * A new candidate joined.
         */
        CandidateAdded: PlainDescriptor<Anonymize<Idgorhsbgdq2ap>>;
        /**
         * Bond of a candidate updated.
         */
        CandidateBondUpdated: PlainDescriptor<Anonymize<Idgorhsbgdq2ap>>;
        /**
         * A candidate was removed.
         */
        CandidateRemoved: PlainDescriptor<Anonymize<I6v8sm60vvkmk7>>;
        /**
         * An account was replaced in the candidate list by another one.
         */
        CandidateReplaced: PlainDescriptor<Anonymize<I9ubb2kqevnu6t>>;
        /**
         * An account was unable to be added to the Invulnerables because they did not have keys
         * registered. Other Invulnerables may have been set.
         */
        InvalidInvulnerableSkipped: PlainDescriptor<Anonymize<I6v8sm60vvkmk7>>;
    };
    Session: {
        /**
         * New session has happened. Note that the argument is the session index, not the
         * block number as the type might suggest.
         */
        NewSession: PlainDescriptor<Anonymize<I2hq50pu2kdjpo>>;
        /**
         * The `NewSession` event in the current block also implies a new validator set to be
         * queued.
         */
        NewQueued: PlainDescriptor<undefined>;
        /**
         * Validator has been disabled.
         */
        ValidatorDisabled: PlainDescriptor<Anonymize<I9acqruh7322g2>>;
        /**
         * Validator has been re-enabled.
         */
        ValidatorReenabled: PlainDescriptor<Anonymize<I9acqruh7322g2>>;
    };
    XcmpQueue: {
        /**
         * An HRMP message was sent to a sibling parachain.
         */
        XcmpMessageSent: PlainDescriptor<Anonymize<I137t1cld92pod>>;
    };
    PolkadotXcm: {
        /**
         * Execution of an XCM message was attempted.
         */
        Attempted: PlainDescriptor<Anonymize<I61d51nv4cou88>>;
        /**
         * An XCM message was sent.
         */
        Sent: PlainDescriptor<Anonymize<If8u5kl4h8070m>>;
        /**
         * An XCM message failed to send.
         */
        SendFailed: PlainDescriptor<Anonymize<Ibmuil6p3vl83l>>;
        /**
         * An XCM message failed to process.
         */
        ProcessXcmError: PlainDescriptor<Anonymize<I7lul91g50ae87>>;
        /**
         * Query response received which does not match a registered query. This may be because a
         * matching query was never registered, it may be because it is a duplicate response, or
         * because the query timed out.
         */
        UnexpectedResponse: PlainDescriptor<Anonymize<Icl7nl1rfeog3i>>;
        /**
         * Query response has been received and is ready for taking with `take_response`. There is
         * no registered notification call.
         */
        ResponseReady: PlainDescriptor<Anonymize<Iasr6pj6shs0fl>>;
        /**
         * Query response has been received and query is removed. The registered notification has
         * been dispatched and executed successfully.
         */
        Notified: PlainDescriptor<Anonymize<I2uqmls7kcdnii>>;
        /**
         * Query response has been received and query is removed. The registered notification
         * could not be dispatched because the dispatch weight is greater than the maximum weight
         * originally budgeted by this runtime for the query result.
         */
        NotifyOverweight: PlainDescriptor<Anonymize<Idg69klialbkb8>>;
        /**
         * Query response has been received and query is removed. There was a general error with
         * dispatching the notification call.
         */
        NotifyDispatchError: PlainDescriptor<Anonymize<I2uqmls7kcdnii>>;
        /**
         * Query response has been received and query is removed. The dispatch was unable to be
         * decoded into a `Call`; this might be due to dispatch function having a signature which
         * is not `(origin, QueryId, Response)`.
         */
        NotifyDecodeFailed: PlainDescriptor<Anonymize<I2uqmls7kcdnii>>;
        /**
         * Expected query response has been received but the origin location of the response does
         * not match that expected. The query remains registered for a later, valid, response to
         * be received and acted upon.
         */
        InvalidResponder: PlainDescriptor<Anonymize<I7r6b7145022pp>>;
        /**
         * Expected query response has been received but the expected origin location placed in
         * storage by this runtime previously cannot be decoded. The query remains registered.
         *
         * This is unexpected (since a location placed in storage in a previously executing
         * runtime should be readable prior to query timeout) and dangerous since the possibly
         * valid response will be dropped. Manual governance intervention is probably going to be
         * needed.
         */
        InvalidResponderVersion: PlainDescriptor<Anonymize<Icl7nl1rfeog3i>>;
        /**
         * Received query response has been read and removed.
         */
        ResponseTaken: PlainDescriptor<Anonymize<I30pg328m00nr3>>;
        /**
         * Some assets have been placed in an asset trap.
         */
        AssetsTrapped: PlainDescriptor<Anonymize<Icmrn7bogp28cs>>;
        /**
         * An XCM version change notification message has been attempted to be sent.
         *
         * The cost of sending it (borne by the chain) is included.
         */
        VersionChangeNotified: PlainDescriptor<Anonymize<I7m9b5plj4h5ot>>;
        /**
         * The supported version of a location has been changed. This might be through an
         * automatic notification or a manual intervention.
         */
        SupportedVersionChanged: PlainDescriptor<Anonymize<I9kt8c221c83ln>>;
        /**
         * A given location which had a version change subscription was dropped owing to an error
         * sending the notification to it.
         */
        NotifyTargetSendFail: PlainDescriptor<Anonymize<I9onhk772nfs4f>>;
        /**
         * A given location which had a version change subscription was dropped owing to an error
         * migrating the location to our new XCM format.
         */
        NotifyTargetMigrationFail: PlainDescriptor<Anonymize<I3l6bnksrmt56r>>;
        /**
         * Expected query response has been received but the expected querier location placed in
         * storage by this runtime previously cannot be decoded. The query remains registered.
         *
         * This is unexpected (since a location placed in storage in a previously executing
         * runtime should be readable prior to query timeout) and dangerous since the possibly
         * valid response will be dropped. Manual governance intervention is probably going to be
         * needed.
         */
        InvalidQuerierVersion: PlainDescriptor<Anonymize<Icl7nl1rfeog3i>>;
        /**
         * Expected query response has been received but the querier location of the response does
         * not match the expected. The query remains registered for a later, valid, response to
         * be received and acted upon.
         */
        InvalidQuerier: PlainDescriptor<Anonymize<Idh09k0l2pmdcg>>;
        /**
         * A remote has requested XCM version change notification from us and we have honored it.
         * A version information message is sent to them and its cost is included.
         */
        VersionNotifyStarted: PlainDescriptor<Anonymize<I7uoiphbm0tj4r>>;
        /**
         * We have requested that a remote chain send us XCM version change notifications.
         */
        VersionNotifyRequested: PlainDescriptor<Anonymize<I7uoiphbm0tj4r>>;
        /**
         * We have requested that a remote chain stops sending us XCM version change
         * notifications.
         */
        VersionNotifyUnrequested: PlainDescriptor<Anonymize<I7uoiphbm0tj4r>>;
        /**
         * Fees were paid from a location for an operation (often for using `SendXcm`).
         */
        FeesPaid: PlainDescriptor<Anonymize<I512p1n7qt24l8>>;
        /**
         * Some assets have been claimed from an asset trap
         */
        AssetsClaimed: PlainDescriptor<Anonymize<Icmrn7bogp28cs>>;
        /**
         * A XCM version migration finished.
         */
        VersionMigrationFinished: PlainDescriptor<Anonymize<I6s1nbislhk619>>;
        /**
         * An `aliaser` location was authorized by `target` to alias it, authorization valid until
         * `expiry` block number.
         */
        AliasAuthorized: PlainDescriptor<Anonymize<I3gghqnh2mj0is>>;
        /**
         * `target` removed alias authorization for `aliaser`.
         */
        AliasAuthorizationRemoved: PlainDescriptor<Anonymize<I6iv852roh6t3h>>;
        /**
         * `target` removed all alias authorizations.
         */
        AliasesAuthorizationsRemoved: PlainDescriptor<Anonymize<I9oc2o6itbiopq>>;
    };
    CumulusXcm: {
        /**
         * Downward message is invalid XCM.
         * \[ id \]
         */
        InvalidFormat: PlainDescriptor<FixedSizeBinary<32>>;
        /**
         * Downward message is unsupported version of XCM.
         * \[ id \]
         */
        UnsupportedVersion: PlainDescriptor<FixedSizeBinary<32>>;
        /**
         * Downward message executed with the given outcome.
         * \[ id, outcome \]
         */
        ExecutedDownward: PlainDescriptor<Anonymize<Ibslgga81p36aa>>;
    };
    MessageQueue: {
        /**
         * Message discarded due to an error in the `MessageProcessor` (usually a format error).
         */
        ProcessingFailed: PlainDescriptor<Anonymize<I1rvj4ubaplho0>>;
        /**
         * Message is processed.
         */
        Processed: PlainDescriptor<Anonymize<Ia3uu7lqcc1q1i>>;
        /**
         * Message placed in overweight queue.
         */
        OverweightEnqueued: PlainDescriptor<Anonymize<I7crucfnonitkn>>;
        /**
         * This page was reaped.
         */
        PageReaped: PlainDescriptor<Anonymize<I7tmrp94r9sq4n>>;
    };
    Statement: {
        /**
         * A new statement is submitted
         */
        NewStatement: PlainDescriptor<Anonymize<I3uua81e9uvgnp>>;
    };
    TemplatePallet: {
        /**
         * A new claim was created.
         */
        ClaimCreated: PlainDescriptor<Anonymize<I9p6tgcfbrrlod>>;
        /**
         * A claim was revoked by its owner.
         */
        ClaimRevoked: PlainDescriptor<Anonymize<I9p6tgcfbrrlod>>;
    };
    SocialAppRegistry: {
        /**
         * A new app was registered.
         */
        AppRegistered: PlainDescriptor<Anonymize<Ibh7279nftp2hh>>;
        /**
         * An app was deregistered (set to inactive, bond returned).
         */
        AppDeregistered: PlainDescriptor<Anonymize<Ibh7279nftp2hh>>;
        /**
         * An app owner dispatched a call as `Origin::AppModerator`. The
         * downstream call's own event carries the effect — this one
         * simply records the moderation fact for audit tooling.
         */
        ModeratorDispatched: PlainDescriptor<Anonymize<I8479qlmjf9la2>>;
    };
    SocialProfiles: {
        /**
         * A new profile was created.
         */
        ProfileCreated: PlainDescriptor<Anonymize<Icbccs0ug47ilf>>;
        /**
         * Profile metadata was updated.
         */
        ProfileUpdated: PlainDescriptor<Anonymize<Icbccs0ug47ilf>>;
        /**
         * Profile follow fee was updated.
         */
        FollowFeeUpdated: PlainDescriptor<Anonymize<I6jm7rmcmjl45d>>;
        /**
         * A profile was deleted and bond returned.
         */
        ProfileDeleted: PlainDescriptor<Anonymize<Icbccs0ug47ilf>>;
    };
    SocialGraph: {
        /**
         * A user followed another user.
         */
        Followed: PlainDescriptor<Anonymize<Ib25q8de7tg90l>>;
        /**
         * A user unfollowed another user.
         */
        Unfollowed: PlainDescriptor<Anonymize<I7uibdp0qbpf1m>>;
    };
    SocialFeeds: {
        /**
         * A new post was created.
         */
        PostCreated: PlainDescriptor<Anonymize<I2crm4j70329fs>>;
        /**
         * A reply was created.
         */
        ReplyCreated: PlainDescriptor<Anonymize<Ich1gn08cdvajd>>;
        /**
         * A post was unlocked by a viewer (fee paid to author).
         */
        PostUnlocked: PlainDescriptor<Anonymize<I8pdmes4qb1slv>>;
        /**
         * An app moderator redacted a post. The record is kept (author
         * stays visible for appeals) but clients are expected to render
         * the content as removed.
         */
        PostRedacted: PlainDescriptor<Anonymize<I3spiqmkfrd4nh>>;
        /**
         * The admin configured (or rotated) the key service.
         *
         * Observers can diff `previous_account` vs `account` to detect
         * rotations, and bind `version` to the X25519 public key so
         * clients know which pk to use for new capsules.
         */
        KeyServiceUpdated: PlainDescriptor<Anonymize<I38bk60rnerv88>>;
        /**
         * The collator OCW delivered a wrapped key for a pending unlock.
         */
        UnlockKeyDelivered: PlainDescriptor<Anonymize<Ics676nkrsbu5j>>;
        /**
         * The author called `unlock_post` on their own post. No state
         * change, no fee — they already have implicit access — but we
         * emit so clients get a deterministic acknowledgement instead
         * of a silent `Ok`.
         */
        AuthorSelfUnlockAcknowledged: PlainDescriptor<Anonymize<Ifv4jftsc618sl>>;
    };
    Identity: {
        /**
         * A name was set or reset (which will remove all judgements).
         */
        IdentitySet: PlainDescriptor<Anonymize<I4cbvqmqadhrea>>;
        /**
         * A name was cleared, and the given balance returned.
         */
        IdentityCleared: PlainDescriptor<Anonymize<Iep1lmt6q3s6r3>>;
        /**
         * A name was removed and the given balance slashed.
         */
        IdentityKilled: PlainDescriptor<Anonymize<Iep1lmt6q3s6r3>>;
        /**
         * A judgement was asked from a registrar.
         */
        JudgementRequested: PlainDescriptor<Anonymize<I1fac16213rie2>>;
        /**
         * A judgement request was retracted.
         */
        JudgementUnrequested: PlainDescriptor<Anonymize<I1fac16213rie2>>;
        /**
         * A judgement was given by a registrar.
         */
        JudgementGiven: PlainDescriptor<Anonymize<Ifjt77oc391o43>>;
        /**
         * A registrar was added.
         */
        RegistrarAdded: PlainDescriptor<Anonymize<Itvt1jsipv0lc>>;
        /**
         * A sub-identity was added to an identity and the deposit paid.
         */
        SubIdentityAdded: PlainDescriptor<Anonymize<Ick3mveut33f44>>;
        /**
         * An account's sub-identities were set (in bulk).
         */
        SubIdentitiesSet: PlainDescriptor<Anonymize<I719lqkkbtikbl>>;
        /**
         * A given sub-account's associated name was changed by its super-identity.
         */
        SubIdentityRenamed: PlainDescriptor<Anonymize<Ie4intrc3n8jfu>>;
        /**
         * A sub-identity was removed from an identity and the deposit freed.
         */
        SubIdentityRemoved: PlainDescriptor<Anonymize<Ick3mveut33f44>>;
        /**
         * A sub-identity was cleared, and the given deposit repatriated from the
         * main identity account to the sub-identity account.
         */
        SubIdentityRevoked: PlainDescriptor<Anonymize<Ick3mveut33f44>>;
        /**
         * A username authority was added.
         */
        AuthorityAdded: PlainDescriptor<Anonymize<I2rg5btjrsqec0>>;
        /**
         * A username authority was removed.
         */
        AuthorityRemoved: PlainDescriptor<Anonymize<I2rg5btjrsqec0>>;
        /**
         * A username was set for `who`.
         */
        UsernameSet: PlainDescriptor<Anonymize<Ibdqerrooruuq9>>;
        /**
         * A username was queued, but `who` must accept it prior to `expiration`.
         */
        UsernameQueued: PlainDescriptor<Anonymize<I8u2ba9jeiu6q0>>;
        /**
         * A queued username passed its expiration without being claimed and was removed.
         */
        PreapprovalExpired: PlainDescriptor<Anonymize<I7ieadb293k6b4>>;
        /**
         * A username was set as a primary and can be looked up from `who`.
         */
        PrimaryUsernameSet: PlainDescriptor<Anonymize<Ibdqerrooruuq9>>;
        /**
         * A dangling username (as in, a username corresponding to an account that has removed its
         * identity) has been removed.
         */
        DanglingUsernameRemoved: PlainDescriptor<Anonymize<Ibdqerrooruuq9>>;
        /**
         * A username has been unbound.
         */
        UsernameUnbound: PlainDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * A username has been removed.
         */
        UsernameRemoved: PlainDescriptor<Anonymize<Ie5l999tf7t2te>>;
        /**
         * A username has been killed.
         */
        UsernameKilled: PlainDescriptor<Anonymize<Ie5l999tf7t2te>>;
    };
    SocialManagers: {
        /**
         * A new manager authorization was granted.
         */
        ManagerAdded: PlainDescriptor<Anonymize<I2jtkn2pq6gl93>>;
        /**
         * An authorization was explicitly revoked by the owner.
         */
        ManagerRemoved: PlainDescriptor<Anonymize<Iavmg865r513th>>;
        /**
         * The owner wiped every manager authorization in a single call.
         */
        AllManagersRemoved: PlainDescriptor<Anonymize<I6gobf0er3s1tq>>;
        /**
         * A manager successfully dispatched an inner call on the owner's
         * behalf. `result` reports whether the inner call succeeded.
         */
        ActedAsManager: PlainDescriptor<Anonymize<I52ueqm37mfa10>>;
        /**
         * The `on_idle` hook lazily purged an expired authorization and
         * returned the deposit to the owner.
         */
        ExpiredManagerPurged: PlainDescriptor<Anonymize<Iavmg865r513th>>;
    };
    Sponsorship: {
        /**
         * A sponsor added a beneficiary. If the beneficiary already had
         * a sponsor, `previous_sponsor` is set to the one being replaced.
         */
        BeneficiaryRegistered: PlainDescriptor<Anonymize<Idkg126uvecems>>;
        /**
         * A sponsor removed one of their beneficiaries.
         */
        BeneficiaryRevoked: PlainDescriptor<Anonymize<I1ctqnpt9rk0bn>>;
        /**
         * A beneficiary removed themselves from their sponsor's list.
         */
        SponsorAbandoned: PlainDescriptor<Anonymize<I1ctqnpt9rk0bn>>;
        /**
         * A sponsor topped up their pot.
         */
        PotToppedUp: PlainDescriptor<Anonymize<I5dk96r09q9b08>>;
        /**
         * A sponsor withdrew remaining pot funds.
         */
        PotWithdrawn: PlainDescriptor<Anonymize<I5dk96r09q9b08>>;
        /**
         * A transaction's fee was covered by the sponsor.
         */
        FeeSponsored: PlainDescriptor<Anonymize<I34ghkccn70ma>>;
    };
};
type IError = {
    System: {
        /**
         * The name of specification does not match between the current runtime
         * and the new runtime.
         */
        InvalidSpecName: PlainDescriptor<undefined>;
        /**
         * The specification version is not allowed to decrease between the current runtime
         * and the new runtime.
         */
        SpecVersionNeedsToIncrease: PlainDescriptor<undefined>;
        /**
         * Failed to extract the runtime version from the new runtime.
         *
         * Either calling `Core_version` or decoding `RuntimeVersion` failed.
         */
        FailedToExtractRuntimeVersion: PlainDescriptor<undefined>;
        /**
         * Suicide called when the account has non-default composite data.
         */
        NonDefaultComposite: PlainDescriptor<undefined>;
        /**
         * There is a non-zero reference count preventing the account from being purged.
         */
        NonZeroRefCount: PlainDescriptor<undefined>;
        /**
         * The origin filter prevent the call to be dispatched.
         */
        CallFiltered: PlainDescriptor<undefined>;
        /**
         * A multi-block migration is ongoing and prevents the current code from being replaced.
         */
        MultiBlockMigrationsOngoing: PlainDescriptor<undefined>;
        /**
         * No upgrade authorized.
         */
        NothingAuthorized: PlainDescriptor<undefined>;
        /**
         * The submitted code is not authorized.
         */
        Unauthorized: PlainDescriptor<undefined>;
    };
    ParachainSystem: {
        /**
         * Attempt to upgrade validation function while existing upgrade pending.
         */
        OverlappingUpgrades: PlainDescriptor<undefined>;
        /**
         * Polkadot currently prohibits this parachain from upgrading its validation function.
         */
        ProhibitedByPolkadot: PlainDescriptor<undefined>;
        /**
         * The supplied validation function has compiled into a blob larger than Polkadot is
         * willing to run.
         */
        TooBig: PlainDescriptor<undefined>;
        /**
         * The inherent which supplies the validation data did not run this block.
         */
        ValidationDataNotAvailable: PlainDescriptor<undefined>;
        /**
         * The inherent which supplies the host configuration did not run this block.
         */
        HostConfigurationNotAvailable: PlainDescriptor<undefined>;
        /**
         * No validation function upgrade is currently scheduled.
         */
        NotScheduled: PlainDescriptor<undefined>;
    };
    Balances: {
        /**
         * Vesting balance too high to send value.
         */
        VestingBalance: PlainDescriptor<undefined>;
        /**
         * Account liquidity restrictions prevent withdrawal.
         */
        LiquidityRestrictions: PlainDescriptor<undefined>;
        /**
         * Balance too low to send value.
         */
        InsufficientBalance: PlainDescriptor<undefined>;
        /**
         * Value too low to create account due to existential deposit.
         */
        ExistentialDeposit: PlainDescriptor<undefined>;
        /**
         * Transfer/payment would kill account.
         */
        Expendability: PlainDescriptor<undefined>;
        /**
         * A vesting schedule already exists for this account.
         */
        ExistingVestingSchedule: PlainDescriptor<undefined>;
        /**
         * Beneficiary account must pre-exist.
         */
        DeadAccount: PlainDescriptor<undefined>;
        /**
         * Number of named reserves exceed `MaxReserves`.
         */
        TooManyReserves: PlainDescriptor<undefined>;
        /**
         * Number of holds exceed `VariantCountOf<T::RuntimeHoldReason>`.
         */
        TooManyHolds: PlainDescriptor<undefined>;
        /**
         * Number of freezes exceed `MaxFreezes`.
         */
        TooManyFreezes: PlainDescriptor<undefined>;
        /**
         * The issuance cannot be modified since it is already deactivated.
         */
        IssuanceDeactivated: PlainDescriptor<undefined>;
        /**
         * The delta cannot be zero.
         */
        DeltaZero: PlainDescriptor<undefined>;
    };
    Sudo: {
        /**
         * Sender must be the Sudo account.
         */
        RequireSudo: PlainDescriptor<undefined>;
    };
    CollatorSelection: {
        /**
         * The pallet has too many candidates.
         */
        TooManyCandidates: PlainDescriptor<undefined>;
        /**
         * Leaving would result in too few candidates.
         */
        TooFewEligibleCollators: PlainDescriptor<undefined>;
        /**
         * Account is already a candidate.
         */
        AlreadyCandidate: PlainDescriptor<undefined>;
        /**
         * Account is not a candidate.
         */
        NotCandidate: PlainDescriptor<undefined>;
        /**
         * There are too many Invulnerables.
         */
        TooManyInvulnerables: PlainDescriptor<undefined>;
        /**
         * Account is already an Invulnerable.
         */
        AlreadyInvulnerable: PlainDescriptor<undefined>;
        /**
         * Account is not an Invulnerable.
         */
        NotInvulnerable: PlainDescriptor<undefined>;
        /**
         * Account has no associated validator ID.
         */
        NoAssociatedValidatorId: PlainDescriptor<undefined>;
        /**
         * Validator ID is not yet registered.
         */
        ValidatorNotRegistered: PlainDescriptor<undefined>;
        /**
         * Could not insert in the candidate list.
         */
        InsertToCandidateListFailed: PlainDescriptor<undefined>;
        /**
         * Could not remove from the candidate list.
         */
        RemoveFromCandidateListFailed: PlainDescriptor<undefined>;
        /**
         * New deposit amount would be below the minimum candidacy bond.
         */
        DepositTooLow: PlainDescriptor<undefined>;
        /**
         * Could not update the candidate list.
         */
        UpdateCandidateListFailed: PlainDescriptor<undefined>;
        /**
         * Deposit amount is too low to take the target's slot in the candidate list.
         */
        InsufficientBond: PlainDescriptor<undefined>;
        /**
         * The target account to be replaced in the candidate list is not a candidate.
         */
        TargetIsNotCandidate: PlainDescriptor<undefined>;
        /**
         * The updated deposit amount is equal to the amount already reserved.
         */
        IdenticalDeposit: PlainDescriptor<undefined>;
        /**
         * Cannot lower candidacy bond while occupying a future collator slot in the list.
         */
        InvalidUnreserve: PlainDescriptor<undefined>;
    };
    Session: {
        /**
         * Invalid ownership proof.
         */
        InvalidProof: PlainDescriptor<undefined>;
        /**
         * No associated validator ID for account.
         */
        NoAssociatedValidatorId: PlainDescriptor<undefined>;
        /**
         * Registered duplicate key.
         */
        DuplicatedKey: PlainDescriptor<undefined>;
        /**
         * No keys are associated with this account.
         */
        NoKeys: PlainDescriptor<undefined>;
        /**
         * Key setting account is not live, so it's impossible to associate keys.
         */
        NoAccount: PlainDescriptor<undefined>;
    };
    XcmpQueue: {
        /**
         * Setting the queue config failed since one of its values was invalid.
         */
        BadQueueConfig: PlainDescriptor<undefined>;
        /**
         * The execution is already suspended.
         */
        AlreadySuspended: PlainDescriptor<undefined>;
        /**
         * The execution is already resumed.
         */
        AlreadyResumed: PlainDescriptor<undefined>;
        /**
         * There are too many active outbound channels.
         */
        TooManyActiveOutboundChannels: PlainDescriptor<undefined>;
        /**
         * The message is too big.
         */
        TooBig: PlainDescriptor<undefined>;
    };
    PolkadotXcm: {
        /**
         * The desired destination was unreachable, generally because there is a no way of routing
         * to it.
         */
        Unreachable: PlainDescriptor<undefined>;
        /**
         * There was some other issue (i.e. not to do with routing) in sending the message.
         * Perhaps a lack of space for buffering the message.
         */
        SendFailure: PlainDescriptor<undefined>;
        /**
         * The message execution fails the filter.
         */
        Filtered: PlainDescriptor<undefined>;
        /**
         * The message's weight could not be determined.
         */
        UnweighableMessage: PlainDescriptor<undefined>;
        /**
         * The destination `Location` provided cannot be inverted.
         */
        DestinationNotInvertible: PlainDescriptor<undefined>;
        /**
         * The assets to be sent are empty.
         */
        Empty: PlainDescriptor<undefined>;
        /**
         * Could not re-anchor the assets to declare the fees for the destination chain.
         */
        CannotReanchor: PlainDescriptor<undefined>;
        /**
         * Too many assets have been attempted for transfer.
         */
        TooManyAssets: PlainDescriptor<undefined>;
        /**
         * Origin is invalid for sending.
         */
        InvalidOrigin: PlainDescriptor<undefined>;
        /**
         * The version of the `Versioned` value used is not able to be interpreted.
         */
        BadVersion: PlainDescriptor<undefined>;
        /**
         * The given location could not be used (e.g. because it cannot be expressed in the
         * desired version of XCM).
         */
        BadLocation: PlainDescriptor<undefined>;
        /**
         * The referenced subscription could not be found.
         */
        NoSubscription: PlainDescriptor<undefined>;
        /**
         * The location is invalid since it already has a subscription from us.
         */
        AlreadySubscribed: PlainDescriptor<undefined>;
        /**
         * Could not check-out the assets for teleportation to the destination chain.
         */
        CannotCheckOutTeleport: PlainDescriptor<undefined>;
        /**
         * The owner does not own (all) of the asset that they wish to do the operation on.
         */
        LowBalance: PlainDescriptor<undefined>;
        /**
         * The asset owner has too many locks on the asset.
         */
        TooManyLocks: PlainDescriptor<undefined>;
        /**
         * The given account is not an identifiable sovereign account for any location.
         */
        AccountNotSovereign: PlainDescriptor<undefined>;
        /**
         * The operation required fees to be paid which the initiator could not meet.
         */
        FeesNotMet: PlainDescriptor<undefined>;
        /**
         * A remote lock with the corresponding data could not be found.
         */
        LockNotFound: PlainDescriptor<undefined>;
        /**
         * The unlock operation cannot succeed because there are still consumers of the lock.
         */
        InUse: PlainDescriptor<undefined>;
        /**
         * Invalid asset, reserve chain could not be determined for it.
         */
        InvalidAssetUnknownReserve: PlainDescriptor<undefined>;
        /**
         * Invalid asset, do not support remote asset reserves with different fees reserves.
         */
        InvalidAssetUnsupportedReserve: PlainDescriptor<undefined>;
        /**
         * Too many assets with different reserve locations have been attempted for transfer.
         */
        TooManyReserves: PlainDescriptor<undefined>;
        /**
         * Local XCM execution incomplete.
         */
        LocalExecutionIncomplete: PlainDescriptor<undefined>;
        /**
         * Too many locations authorized to alias origin.
         */
        TooManyAuthorizedAliases: PlainDescriptor<undefined>;
        /**
         * Expiry block number is in the past.
         */
        ExpiresInPast: PlainDescriptor<undefined>;
        /**
         * The alias to remove authorization for was not found.
         */
        AliasNotFound: PlainDescriptor<undefined>;
        /**
         * Local XCM execution incomplete with the actual XCM error and the index of the
         * instruction that caused the error.
         */
        LocalExecutionIncompleteWithError: PlainDescriptor<Anonymize<I5r8t4iaend96p>>;
    };
    MessageQueue: {
        /**
         * Page is not reapable because it has items remaining to be processed and is not old
         * enough.
         */
        NotReapable: PlainDescriptor<undefined>;
        /**
         * Page to be reaped does not exist.
         */
        NoPage: PlainDescriptor<undefined>;
        /**
         * The referenced message could not be found.
         */
        NoMessage: PlainDescriptor<undefined>;
        /**
         * The message was already processed and cannot be processed again.
         */
        AlreadyProcessed: PlainDescriptor<undefined>;
        /**
         * The message is queued for future execution.
         */
        Queued: PlainDescriptor<undefined>;
        /**
         * There is temporarily not enough weight to continue servicing messages.
         */
        InsufficientWeight: PlainDescriptor<undefined>;
        /**
         * This message is temporarily unprocessable.
         *
         * Such errors are expected, but not guaranteed, to resolve themselves eventually through
         * retrying.
         */
        TemporarilyUnprocessable: PlainDescriptor<undefined>;
        /**
         * The queue is paused and no message can be executed from it.
         *
         * This can change at any time and may resolve in the future by re-trying.
         */
        QueuePaused: PlainDescriptor<undefined>;
        /**
         * Another call is in progress and needs to finish before this call can happen.
         */
        RecursiveDisallowed: PlainDescriptor<undefined>;
    };
    TemplatePallet: {
        /**
         * This hash has already been claimed.
         */
        AlreadyClaimed: PlainDescriptor<undefined>;
        /**
         * The caller is not the owner of this claim.
         */
        NotClaimOwner: PlainDescriptor<undefined>;
        /**
         * No claim exists for this hash.
         */
        ClaimNotFound: PlainDescriptor<undefined>;
    };
    SocialAppRegistry: {
        /**
         * The caller does not have enough balance to cover the registration bond.
         */
        InsufficientBond: PlainDescriptor<undefined>;
        /**
         * No app exists with the given ID.
         */
        AppNotFound: PlainDescriptor<undefined>;
        /**
         * The caller is not the owner of this app.
         */
        NotAppOwner: PlainDescriptor<undefined>;
        /**
         * The app is already inactive.
         */
        AppAlreadyInactive: PlainDescriptor<undefined>;
        /**
         * The owner has reached the maximum number of registered apps.
         */
        TooManyApps: PlainDescriptor<undefined>;
        /**
         * The provided metadata exceeds the maximum allowed length.
         */
        MetadataTooLong: PlainDescriptor<undefined>;
        /**
         * The app ID counter has overflowed — no more apps can be registered.
         */
        AppIdOverflow: PlainDescriptor<undefined>;
    };
    SocialProfiles: {
        /**
         * A profile already exists for this account.
         */
        ProfileAlreadyExists: PlainDescriptor<undefined>;
        /**
         * No profile found for this account.
         */
        ProfileNotFound: PlainDescriptor<undefined>;
        /**
         * The caller does not have enough balance to cover the profile bond.
         */
        InsufficientBond: PlainDescriptor<undefined>;
        /**
         * The provided metadata exceeds the maximum allowed length.
         */
        MetadataTooLong: PlainDescriptor<undefined>;
    };
    SocialGraph: {
        /**
         * One or both accounts do not have a profile.
         */
        ProfileNotFound: PlainDescriptor<undefined>;
        /**
         * A user cannot follow themselves.
         */
        CannotFollowSelf: PlainDescriptor<undefined>;
        /**
         * The follow relationship already exists.
         */
        AlreadyFollowing: PlainDescriptor<undefined>;
        /**
         * The follow relationship does not exist.
         */
        NotFollowing: PlainDescriptor<undefined>;
        /**
         * The follower does not have enough balance to pay the follow fee.
         */
        InsufficientBalance: PlainDescriptor<undefined>;
    };
    SocialFeeds: {
        /**
         * The caller does not have a profile.
         */
        ProfileNotFound: PlainDescriptor<undefined>;
        /**
         * The specified app does not exist or is inactive.
         */
        AppNotFound: PlainDescriptor<undefined>;
        /**
         * The parent post does not exist.
         */
        ParentPostNotFound: PlainDescriptor<undefined>;
        /**
         * The caller does not have enough balance to pay the fee.
         */
        InsufficientBalance: PlainDescriptor<undefined>;
        /**
         * The provided content exceeds the maximum allowed length.
         */
        ContentTooLong: PlainDescriptor<undefined>;
        /**
         * The author has reached the maximum number of posts.
         */
        TooManyPosts: PlainDescriptor<undefined>;
        /**
         * The parent post has reached the maximum number of replies.
         */
        TooManyReplies: PlainDescriptor<undefined>;
        /**
         * The post ID counter has overflowed.
         */
        PostIdOverflow: PlainDescriptor<undefined>;
        /**
         * The post does not exist.
         */
        PostNotFound: PlainDescriptor<undefined>;
        /**
         * The post is already unlocked by this viewer.
         */
        AlreadyUnlocked: PlainDescriptor<undefined>;
        /**
         * The post is public and does not need unlocking.
         */
        PostIsPublic: PlainDescriptor<undefined>;
        /**
         * The post does not belong to the app whose moderator is
         * attempting to redact it.
         */
        PostNotInApp: PlainDescriptor<undefined>;
        /**
         * The post is already redacted — repeated redactions are no-ops.
         */
        AlreadyRedacted: PlainDescriptor<undefined>;
        /**
         * Non-public posts must ship a `capsule` of the exact sealed-box
         * length; public posts must not carry one.
         */
        CapsuleInvalid: PlainDescriptor<undefined>;
        /**
         * The ephemeral X25519 public key provided by the viewer is
         * malformed (e.g. all zeros).
         */
        InvalidBuyerPk: PlainDescriptor<undefined>;
        /**
         * The key service is not configured on-chain yet.
         */
        KeyServiceNotConfigured: PlainDescriptor<undefined>;
        /**
         * Wrapped key delivered by the OCW was not the expected length.
         */
        WrappedKeyInvalid: PlainDescriptor<undefined>;
        /**
         * Tried to deliver for an unlock record that does not exist or
         * already has a wrapped key.
         */
        UnlockNotPending: PlainDescriptor<undefined>;
    };
    Identity: {
        /**
         * Too many subs-accounts.
         */
        TooManySubAccounts: PlainDescriptor<undefined>;
        /**
         * Account isn't found.
         */
        NotFound: PlainDescriptor<undefined>;
        /**
         * Account isn't named.
         */
        NotNamed: PlainDescriptor<undefined>;
        /**
         * Empty index.
         */
        EmptyIndex: PlainDescriptor<undefined>;
        /**
         * Fee is changed.
         */
        FeeChanged: PlainDescriptor<undefined>;
        /**
         * No identity found.
         */
        NoIdentity: PlainDescriptor<undefined>;
        /**
         * Sticky judgement.
         */
        StickyJudgement: PlainDescriptor<undefined>;
        /**
         * Judgement given.
         */
        JudgementGiven: PlainDescriptor<undefined>;
        /**
         * Invalid judgement.
         */
        InvalidJudgement: PlainDescriptor<undefined>;
        /**
         * The index is invalid.
         */
        InvalidIndex: PlainDescriptor<undefined>;
        /**
         * The target is invalid.
         */
        InvalidTarget: PlainDescriptor<undefined>;
        /**
         * Maximum amount of registrars reached. Cannot add any more.
         */
        TooManyRegistrars: PlainDescriptor<undefined>;
        /**
         * Account ID is already named.
         */
        AlreadyClaimed: PlainDescriptor<undefined>;
        /**
         * Sender is not a sub-account.
         */
        NotSub: PlainDescriptor<undefined>;
        /**
         * Sub-account isn't owned by sender.
         */
        NotOwned: PlainDescriptor<undefined>;
        /**
         * The provided judgement was for a different identity.
         */
        JudgementForDifferentIdentity: PlainDescriptor<undefined>;
        /**
         * Error that occurs when there is an issue paying for judgement.
         */
        JudgementPaymentFailed: PlainDescriptor<undefined>;
        /**
         * The provided suffix is too long.
         */
        InvalidSuffix: PlainDescriptor<undefined>;
        /**
         * The sender does not have permission to issue a username.
         */
        NotUsernameAuthority: PlainDescriptor<undefined>;
        /**
         * The authority cannot allocate any more usernames.
         */
        NoAllocation: PlainDescriptor<undefined>;
        /**
         * The signature on a username was not valid.
         */
        InvalidSignature: PlainDescriptor<undefined>;
        /**
         * Setting this username requires a signature, but none was provided.
         */
        RequiresSignature: PlainDescriptor<undefined>;
        /**
         * The username does not meet the requirements.
         */
        InvalidUsername: PlainDescriptor<undefined>;
        /**
         * The username is already taken.
         */
        UsernameTaken: PlainDescriptor<undefined>;
        /**
         * The requested username does not exist.
         */
        NoUsername: PlainDescriptor<undefined>;
        /**
         * The username cannot be forcefully removed because it can still be accepted.
         */
        NotExpired: PlainDescriptor<undefined>;
        /**
         * The username cannot be removed because it's still in the grace period.
         */
        TooEarly: PlainDescriptor<undefined>;
        /**
         * The username cannot be removed because it is not unbinding.
         */
        NotUnbinding: PlainDescriptor<undefined>;
        /**
         * The username cannot be unbound because it is already unbinding.
         */
        AlreadyUnbinding: PlainDescriptor<undefined>;
        /**
         * The action cannot be performed because of insufficient privileges (e.g. authority
         * trying to unbind a username provided by the system).
         */
        InsufficientPrivileges: PlainDescriptor<undefined>;
    };
    SocialManagers: {
        /**
         * There is no manager record for this `(owner, manager)` pair.
         */
        ManagerNotFound: PlainDescriptor<undefined>;
        /**
         * A manager with that account already exists for this owner.
         */
        ManagerAlreadyExists: PlainDescriptor<undefined>;
        /**
         * The owner already has [`Config::MaxManagersPerOwner`] active
         * managers and cannot add more.
         */
        TooManyManagers: PlainDescriptor<undefined>;
        /**
         * The authorization has expired and must be renewed by the owner.
         */
        ManagerExpired: PlainDescriptor<undefined>;
        /**
         * The caller tried to act under a scope they were not granted.
         */
        ScopeNotAuthorized: PlainDescriptor<undefined>;
        /**
         * The inner call targets an extrinsic that this pallet refuses to
         * delegate (e.g. self-management, utility::dispatch_as, balance
         * transfers).
         */
        CallNotDelegatable: PlainDescriptor<undefined>;
        /**
         * Requested scope set is empty (no bits set). Prevents accidentally
         * creating useless entries.
         */
        EmptyScopeSet: PlainDescriptor<undefined>;
        /**
         * Expiration block number must be strictly greater than the current
         * block.
         */
        ExpirationInPast: PlainDescriptor<undefined>;
        /**
         * The owner does not have enough free balance to reserve the
         * per-manager deposit.
         */
        InsufficientDeposit: PlainDescriptor<undefined>;
        /**
         * An owner tried to authorize themselves as a manager. There is no
         * semantic value to self-delegation and allowing it would burn a
         * `MaxManagersPerOwner` slot for nothing.
         */
        ManagerCannotBeSelf: PlainDescriptor<undefined>;
    };
    Sponsorship: {
        /**
         * Caller attempted to sponsor themselves.
         */
        CannotSponsorSelf: PlainDescriptor<undefined>;
        /**
         * The caller has no sponsor authorization to revoke.
         */
        NoActiveSponsor: PlainDescriptor<undefined>;
        /**
         * Tried to revoke a beneficiary that is not registered under this
         * sponsor (the beneficiary may have since re-registered with
         * someone else).
         */
        NotYourBeneficiary: PlainDescriptor<undefined>;
        /**
         * The caller does not have enough free balance to top up the pot.
         */
        InsufficientFunds: PlainDescriptor<undefined>;
        /**
         * Requested withdrawal exceeds the sponsor's pot balance.
         */
        WithdrawalExceedsPot: PlainDescriptor<undefined>;
        /**
         * The on-chain pot bookkeeping diverged from the pallet account's
         * free balance. Indicates a bug or state corruption — the
         * extrinsic refuses to proceed rather than panicking, so the
         * sponsor can surface it via governance.
         */
        PotAccountingMismatch: PlainDescriptor<undefined>;
    };
};
type IConstants = {
    System: {
        /**
         * Block & extrinsics weights: base values and limits.
         */
        BlockWeights: PlainDescriptor<Anonymize<In7a38730s6qs>>;
        /**
         * The maximum length of a block (in bytes).
         */
        BlockLength: PlainDescriptor<Anonymize<If15el53dd76v9>>;
        /**
         * Maximum number of block number to block hash mappings to keep (oldest pruned first).
         */
        BlockHashCount: PlainDescriptor<number>;
        /**
         * The weight of runtime database operations the runtime can invoke.
         */
        DbWeight: PlainDescriptor<Anonymize<I9s0ave7t0vnrk>>;
        /**
         * Get the chain's in-code version.
         */
        Version: PlainDescriptor<Anonymize<I4fo08joqmcqnm>>;
        /**
         * The designated SS58 prefix of this chain.
         *
         * This replaces the "ss58Format" property declared in the chain spec. Reason is
         * that the runtime should know about the prefix in order to make use of it as
         * an identifier of the chain.
         */
        SS58Prefix: PlainDescriptor<number>;
    };
    ParachainSystem: {
        /**
         * Returns the parachain ID we are running with.
         */
        SelfParaId: PlainDescriptor<number>;
    };
    Timestamp: {
        /**
         * The minimum period between blocks.
         *
         * Be aware that this is different to the *expected* period that the block production
         * apparatus provides. Your chosen consensus system will generally work with this to
         * determine a sensible block time. For example, in the Aura pallet it will be double this
         * period on default settings.
         */
        MinimumPeriod: PlainDescriptor<bigint>;
    };
    Balances: {
        /**
         * The minimum amount required to keep an account open. MUST BE GREATER THAN ZERO!
         *
         * If you *really* need it to be zero, you can enable the feature `insecure_zero_ed` for
         * this pallet. However, you do so at your own risk: this will open up a major DoS vector.
         * In case you have multiple sources of provider references, you may also get unexpected
         * behaviour if you set this to zero.
         *
         * Bottom line: Do yourself a favour and make it at least one!
         */
        ExistentialDeposit: PlainDescriptor<bigint>;
        /**
         * The maximum number of locks that should exist on an account.
         * Not strictly enforced, but used for weight estimation.
         *
         * Use of locks is deprecated in favour of freezes. See `https://github.com/paritytech/substrate/pull/12951/`
         */
        MaxLocks: PlainDescriptor<number>;
        /**
         * The maximum number of named reserves that can exist on an account.
         *
         * Use of reserves is deprecated in favour of holds. See `https://github.com/paritytech/substrate/pull/12951/`
         */
        MaxReserves: PlainDescriptor<number>;
        /**
         * The maximum number of individual freeze locks that can exist on an account at any time.
         */
        MaxFreezes: PlainDescriptor<number>;
    };
    TransactionPayment: {
        /**
         * A fee multiplier for `Operational` extrinsics to compute "virtual tip" to boost their
         * `priority`
         *
         * This value is multiplied by the `final_fee` to obtain a "virtual tip" that is later
         * added to a tip component in regular `priority` calculations.
         * It means that a `Normal` transaction can front-run a similarly-sized `Operational`
         * extrinsic (with no tip), by including a tip value greater than the virtual tip.
         *
         * ```rust,ignore
         * // For `Normal`
         * let priority = priority_calc(tip);
         *
         * // For `Operational`
         * let virtual_tip = (inclusion_fee + tip) * OperationalFeeMultiplier;
         * let priority = priority_calc(tip + virtual_tip);
         * ```
         *
         * Note that since we use `final_fee` the multiplier applies also to the regular `tip`
         * sent with the transaction. So, not only does the transaction get a priority bump based
         * on the `inclusion_fee`, but we also amplify the impact of tips applied to `Operational`
         * transactions.
         */
        OperationalFeeMultiplier: PlainDescriptor<number>;
    };
    CollatorSelection: {
        /**
         * Account Identifier from which the internal Pot is generated.
         */
        PotId: PlainDescriptor<FixedSizeBinary<8>>;
        /**
         * Maximum number of candidates that we should have.
         *
         * This does not take into account the invulnerables.
         */
        MaxCandidates: PlainDescriptor<number>;
        /**
         * Minimum number eligible collators. Should always be greater than zero. This includes
         * Invulnerable collators. This ensures that there will always be one collator who can
         * produce a block.
         */
        MinEligibleCollators: PlainDescriptor<number>;
        /**
         * Maximum number of invulnerables.
         */
        MaxInvulnerables: PlainDescriptor<number>;
        /**
        
         */
        KickThreshold: PlainDescriptor<number>;
        /**
         * Gets this pallet's derived pot account.
         */
        pot_account: PlainDescriptor<SS58String>;
    };
    Session: {
        /**
         * The amount to be held when setting keys.
         */
        KeyDeposit: PlainDescriptor<bigint>;
    };
    Aura: {
        /**
         * The slot duration Aura should run with, expressed in milliseconds.
         * The effective value of this type should not change while the chain is running.
         *
         * For backwards compatibility either use [`MinimumPeriodTimesTwo`] or a const.
         */
        SlotDuration: PlainDescriptor<bigint>;
    };
    XcmpQueue: {
        /**
         * The maximum number of inbound XCMP channels that can be suspended simultaneously.
         *
         * Any further channel suspensions will fail and messages may get dropped without further
         * notice. Choosing a high value (1000) is okay; the trade-off that is described in
         * [`InboundXcmpSuspended`] still applies at that scale.
         */
        MaxInboundSuspended: PlainDescriptor<number>;
        /**
         * Maximal number of outbound XCMP channels that can have messages queued at the same time.
         *
         * If this is reached, then no further messages can be sent to channels that do not yet
         * have a message queued. This should be set to the expected maximum of outbound channels
         * which is determined by [`Self::ChannelInfo`]. It is important to set this large enough,
         * since otherwise the congestion control protocol will not work as intended and messages
         * may be dropped. This value increases the PoV and should therefore not be picked too
         * high. Governance needs to pay attention to not open more channels than this value.
         */
        MaxActiveOutboundChannels: PlainDescriptor<number>;
        /**
         * The maximal page size for HRMP message pages.
         *
         * A lower limit can be set dynamically, but this is the hard-limit for the PoV worst case
         * benchmarking. The limit for the size of a message is slightly below this, since some
         * overhead is incurred for encoding the format.
         */
        MaxPageSize: PlainDescriptor<number>;
    };
    PolkadotXcm: {
        /**
         * This chain's Universal Location.
         */
        UniversalLocation: PlainDescriptor<XcmV5Junctions>;
        /**
         * The latest supported version that we advertise. Generally just set it to
         * `pallet_xcm::CurrentXcmVersion`.
         */
        AdvertisedXcmVersion: PlainDescriptor<number>;
        /**
         * The maximum number of local XCM locks that a single account may have.
         */
        MaxLockers: PlainDescriptor<number>;
        /**
         * The maximum number of consumers a single remote lock may have.
         */
        MaxRemoteLockConsumers: PlainDescriptor<number>;
    };
    MessageQueue: {
        /**
         * The size of the page; this implies the maximum message size which can be sent.
         *
         * A good value depends on the expected message sizes, their weights, the weight that is
         * available for processing them and the maximal needed message size. The maximal message
         * size is slightly lower than this as defined by [`MaxMessageLenOf`].
         */
        HeapSize: PlainDescriptor<number>;
        /**
         * The maximum number of stale pages (i.e. of overweight messages) allowed before culling
         * can happen. Once there are more stale pages than this, then historical pages may be
         * dropped, even if they contain unprocessed overweight messages.
         */
        MaxStale: PlainDescriptor<number>;
        /**
         * The amount of weight (if any) which should be provided to the message queue for
         * servicing enqueued items `on_initialize`.
         *
         * This may be legitimately `None` in the case that you will call
         * `ServiceQueues::service_queues` manually or set [`Self::IdleMaxServiceWeight`] to have
         * it run in `on_idle`.
         */
        ServiceWeight: PlainDescriptor<Anonymize<Iasb8k6ash5mjn>>;
        /**
         * The maximum amount of weight (if any) to be used from remaining weight `on_idle` which
         * should be provided to the message queue for servicing enqueued items `on_idle`.
         * Useful for parachains to process messages at the same block they are received.
         *
         * If `None`, it will not call `ServiceQueues::service_queues` in `on_idle`.
         */
        IdleMaxServiceWeight: PlainDescriptor<Anonymize<Iasb8k6ash5mjn>>;
    };
    Statement: {
        /**
         * Min balance for priority statements.
         */
        StatementCost: PlainDescriptor<bigint>;
        /**
         * Cost of data byte used for priority calculation.
         */
        ByteCost: PlainDescriptor<bigint>;
        /**
         * Minimum number of statements allowed per account.
         */
        MinAllowedStatements: PlainDescriptor<number>;
        /**
         * Maximum number of statements allowed per account.
         */
        MaxAllowedStatements: PlainDescriptor<number>;
        /**
         * Minimum data bytes allowed per account.
         */
        MinAllowedBytes: PlainDescriptor<number>;
        /**
         * Maximum data bytes allowed per account.
         */
        MaxAllowedBytes: PlainDescriptor<number>;
    };
    SocialAppRegistry: {
        /**
         * Bond amount required to register an app.
         */
        AppBond: PlainDescriptor<bigint>;
        /**
         * Maximum length of the metadata CID (bytes).
         */
        MaxMetadataLen: PlainDescriptor<number>;
        /**
         * Maximum number of apps a single account can own.
         */
        MaxAppsPerOwner: PlainDescriptor<number>;
    };
    SocialProfiles: {
        /**
         * Bond amount required to create a profile.
         */
        ProfileBond: PlainDescriptor<bigint>;
        /**
         * Maximum length of the metadata CID (bytes).
         */
        MaxMetadataLen: PlainDescriptor<number>;
    };
    SocialFeeds: {
        /**
         * Fee to create a post (transferred to app owner or treasury).
         */
        PostFee: PlainDescriptor<bigint>;
        /**
         * Max length of content CID.
         */
        MaxContentLen: PlainDescriptor<number>;
        /**
         * Max posts per author.
         */
        MaxPostsPerAuthor: PlainDescriptor<number>;
        /**
         * Max replies per post.
         */
        MaxRepliesPerPost: PlainDescriptor<number>;
        /**
         * How many blocks an unsigned delivery payload is valid for.
         */
        UnsignedValidityWindow: PlainDescriptor<number>;
        /**
         * Transaction-pool priority for unsigned deliveries.
         */
        UnsignedPriority: PlainDescriptor<bigint>;
    };
    Identity: {
        /**
         * The amount held on deposit for a registered identity.
         */
        BasicDeposit: PlainDescriptor<bigint>;
        /**
         * The amount held on deposit per encoded byte for a registered identity.
         */
        ByteDeposit: PlainDescriptor<bigint>;
        /**
         * The amount held on deposit per registered username. This value should change only in
         * runtime upgrades with proper migration of existing deposits.
         */
        UsernameDeposit: PlainDescriptor<bigint>;
        /**
         * The amount held on deposit for a registered subaccount. This should account for the fact
         * that one storage item's value will increase by the size of an account ID, and there will
         * be another trie item whose value is the size of an account ID plus 32 bytes.
         */
        SubAccountDeposit: PlainDescriptor<bigint>;
        /**
         * The maximum number of sub-accounts allowed per identified account.
         */
        MaxSubAccounts: PlainDescriptor<number>;
        /**
         * Maximum number of registrars allowed in the system. Needed to bound the complexity
         * of, e.g., updating judgements.
         */
        MaxRegistrars: PlainDescriptor<number>;
        /**
         * The number of blocks within which a username grant must be accepted.
         */
        PendingUsernameExpiration: PlainDescriptor<number>;
        /**
         * The number of blocks that must pass to enable the permanent deletion of a username by
         * its respective authority.
         */
        UsernameGracePeriod: PlainDescriptor<number>;
        /**
         * The maximum length of a suffix.
         */
        MaxSuffixLength: PlainDescriptor<number>;
        /**
         * The maximum length of a username, including its suffix and any system-added delimiters.
         */
        MaxUsernameLength: PlainDescriptor<number>;
    };
    SocialManagers: {
        /**
         * Flat deposit reserved on the owner for each active manager entry.
         *
         * Deposits stop a bad actor from bloating state by adding thousands
         * of managers for free. Set to zero in dev runtimes.
         */
        ManagerDepositBase: PlainDescriptor<bigint>;
        /**
         * Maximum number of simultaneously-active managers per owner. Bounds
         * the worst-case iteration cost of `remove_all_managers` and
         * `on_idle` expiry purges.
         */
        MaxManagersPerOwner: PlainDescriptor<number>;
        /**
         * Maximum number of expired entries the `on_idle` hook may purge per
         * block. Keeps idle-reclaim bounded so it never starves other
         * opportunistic work.
         */
        MaxExpiryPurgePerBlock: PlainDescriptor<number>;
        /**
         * Maximum number of `ProfileManagers` entries the `on_idle` hook
         * may *scan* per block while looking for expired entries. This is
         * the real cap on the hook's worst-case cost — without it, a
         * large store of non-expired entries would force the scan to
         * read every key before finding enough expirables to fill the
         * purge budget. Typical value: `MaxExpiryPurgePerBlock * 8`.
         */
        MaxExpiryScanPerBlock: PlainDescriptor<number>;
    };
    Sponsorship: {
        /**
         * Minimum amount a sponsor must keep deposited to be considered
         * active. A pot below this threshold is effectively dormant and
         * the extension will not pay fees from it even if the numeric
         * balance is non-zero.
         */
        MinimumPotBalance: PlainDescriptor<bigint>;
    };
};
type IViewFns = {
    SocialFeeds: {
        /**
         * Fetch a single post with all its metadata. Returns `None` when
         * the post does not exist or was never created.
         */
        post_by_id: RuntimeDescriptor<[post_id: bigint], Anonymize<Ifvkaggraijrot>>;
        /**
         * How many posts the author has ever created (including replies).
         * Cheap — reads the `PostsByAuthor` length without hydrating the
         * actual post records. View function args must implement
         * `Decode` so the SCALE runtime API can dispatch them, which is
         * why this takes `AccountId` by value rather than by reference.
         */
        author_post_count: RuntimeDescriptor<[author: SS58String], number>;
        /**
         * Paginated author feed, newest first, with posts hydrated in a
         * single round-trip. The off-chain client picks a block window
         * (`from`, `to`) and a page size (`limit`) and receives the full
         * `PostInfo` alongside each id — no second call needed.
         *
         * Unknown authors return an empty vec. Holes (post_id present in
         * the timeline index but missing from `Posts`) are skipped
         * silently; that state is not reachable in this pallet today
         * but the filter keeps the view robust to future cleanup paths.
         */
        feed_by_author: RuntimeDescriptor<[author: SS58String, from: Anonymize<I4arjljr6dpflb>, to: Anonymize<I4arjljr6dpflb>, limit: number], Anonymize<If4vimo9j229oc>>;
    };
};
type IRuntimeCalls = {
    /**
     * API necessary for block authorship with aura.
     */
    AuraApi: {
        /**
         * Returns the slot duration for Aura.
         *
         * Currently, only the value provided by this type at genesis will be used.
         */
        slot_duration: RuntimeDescriptor<[], bigint>;
        /**
         * Return the current set of authorities.
         */
        authorities: RuntimeDescriptor<[], Anonymize<Ic5m5lp1oioo8r>>;
    };
    /**
     * This runtime API is used to inform potential block authors whether they will
     * have the right to author at a slot, assuming they have claimed the slot.
     *
     * In particular, this API allows Aura-based parachains to regulate their "unincluded segment",
     * which is the section of the head of the chain which has not yet been made available in the
     * relay chain.
     *
     * When the unincluded segment is short, Aura chains will allow authors to create multiple
     * blocks per slot in order to build a backlog. When it is saturated, this API will limit
     * the amount of blocks that can be created.
     *
     * Changes:
     * - Version 2: Update to `can_build_upon` to take a relay chain `Slot` instead of a parachain `Slot`.
     */
    AuraUnincludedSegmentApi: {
        /**
         * Whether it is legal to extend the chain, assuming the given block is the most
         * recently included one as-of the relay parent that will be built against, and
         * the given relay chain slot.
         *
         * This should be consistent with the logic the runtime uses when validating blocks to
         * avoid issues.
         *
         * When the unincluded segment is empty, i.e. `included_hash == at`, where at is the block
         * whose state we are querying against, this must always return `true` as long as the slot
         * is more recent than the included block itself.
         */
        can_build_upon: RuntimeDescriptor<[included_hash: FixedSizeBinary<32>, slot: bigint], boolean>;
    };
    /**
     * The `Core` runtime api that every Substrate runtime needs to implement.
     */
    Core: {
        /**
         * Returns the version of the runtime.
         */
        version: RuntimeDescriptor<[], Anonymize<I4fo08joqmcqnm>>;
        /**
         * Execute the given block.
         */
        execute_block: RuntimeDescriptor<[block: Anonymize<Iaqet9jc3ihboe>], undefined>;
        /**
         * Initialize a block with the given header and return the runtime executive mode.
         */
        initialize_block: RuntimeDescriptor<[header: Anonymize<Ic952bubvq4k7d>], Anonymize<I2v50gu3s1aqk6>>;
    };
    /**
     * The `Metadata` api trait that returns metadata for the runtime.
     */
    Metadata: {
        /**
         * Returns the metadata of a runtime.
         */
        metadata: RuntimeDescriptor<[], Binary>;
        /**
         * Returns the metadata at a given version.
         *
         * If the given `version` isn't supported, this will return `None`.
         * Use [`Self::metadata_versions`] to find out about supported metadata version of the runtime.
         */
        metadata_at_version: RuntimeDescriptor<[version: number], Anonymize<Iabpgqcjikia83>>;
        /**
         * Returns the supported metadata versions.
         *
         * This can be used to call `metadata_at_version`.
         */
        metadata_versions: RuntimeDescriptor<[], Anonymize<Icgljjb6j82uhn>>;
    };
    /**
     * Runtime API for executing view functions
     */
    RuntimeViewFunction: {
        /**
         * Execute a view function query.
         */
        execute_view_function: RuntimeDescriptor<[query_id: Anonymize<I4gil44d08grh>, input: Binary], Anonymize<I7u915mvkdsb08>>;
    };
    /**
     * The `BlockBuilder` api trait that provides the required functionality for building a block.
     */
    BlockBuilder: {
        /**
         * Apply the given extrinsic.
         *
         * Returns an inclusion outcome which specifies if this extrinsic is included in
         * this block or not.
         */
        apply_extrinsic: RuntimeDescriptor<[extrinsic: Binary], Anonymize<Ifgpmvcafkjte5>>;
        /**
         * Finish the current block.
         */
        finalize_block: RuntimeDescriptor<[], Anonymize<Ic952bubvq4k7d>>;
        /**
         * Generate inherent extrinsics. The inherent data will vary from chain to chain.
         */
        inherent_extrinsics: RuntimeDescriptor<[inherent: Anonymize<If7uv525tdvv7a>], Anonymize<Itom7fk49o0c9>>;
        /**
         * Check that the inherents are valid. The inherent data will vary from chain to chain.
         */
        check_inherents: RuntimeDescriptor<[block: Anonymize<Iaqet9jc3ihboe>, data: Anonymize<If7uv525tdvv7a>], Anonymize<I2an1fs2eiebjp>>;
    };
    /**
     * The `TaggedTransactionQueue` api trait for interfering with the transaction queue.
     */
    TaggedTransactionQueue: {
        /**
         * Validate the transaction.
         *
         * This method is invoked by the transaction pool to learn details about given transaction.
         * The implementation should make sure to verify the correctness of the transaction
         * against current state. The given `block_hash` corresponds to the hash of the block
         * that is used as current state.
         *
         * Note that this call may be performed by the pool multiple times and transactions
         * might be verified in any possible order.
         */
        validate_transaction: RuntimeDescriptor<[source: TransactionValidityTransactionSource, tx: Binary, block_hash: FixedSizeBinary<32>], Anonymize<I9ask1o4tfvcvs>>;
    };
    /**
     * The offchain worker api.
     */
    OffchainWorkerApi: {
        /**
         * Starts the off-chain task for given block header.
         */
        offchain_worker: RuntimeDescriptor<[header: Anonymize<Ic952bubvq4k7d>], undefined>;
    };
    /**
     * Session keys runtime api.
     */
    SessionKeys: {
        /**
         * Generate a set of session keys with optionally using the given seed.
         * The keys should be stored within the keystore exposed via runtime
         * externalities.
         *
         * The seed needs to be a valid `utf8` string.
         *
         * Returns the concatenated SCALE encoded public keys.
         */
        generate_session_keys: RuntimeDescriptor<[seed: Anonymize<Iabpgqcjikia83>], Binary>;
        /**
         * Decode the given public session keys.
         *
         * Returns the list of public raw public keys + key type.
         */
        decode_session_keys: RuntimeDescriptor<[encoded: Binary], Anonymize<Icerf8h8pdu8ss>>;
    };
    /**
     * The API to query account nonce.
     */
    AccountNonceApi: {
        /**
         * Get current account nonce of given `AccountId`.
         */
        account_nonce: RuntimeDescriptor<[account: SS58String], number>;
    };
    /**
    
     */
    TransactionPaymentApi: {
        /**
        
         */
        query_info: RuntimeDescriptor<[uxt: Binary, len: number], Anonymize<I6spmpef2c7svf>>;
        /**
        
         */
        query_fee_details: RuntimeDescriptor<[uxt: Binary, len: number], Anonymize<Iei2mvq0mjvt81>>;
        /**
        
         */
        query_weight_to_fee: RuntimeDescriptor<[weight: Anonymize<I4q39t5hn830vp>], bigint>;
        /**
        
         */
        query_length_to_fee: RuntimeDescriptor<[length: number], bigint>;
    };
    /**
    
     */
    TransactionPaymentCallApi: {
        /**
         * Query information of a dispatch class, weight, and fee of a given encoded `Call`.
         */
        query_call_info: RuntimeDescriptor<[call: Anonymize<Icmt859r8ealc1>, len: number], Anonymize<I6spmpef2c7svf>>;
        /**
         * Query fee details of a given encoded `Call`.
         */
        query_call_fee_details: RuntimeDescriptor<[call: Anonymize<Icmt859r8ealc1>, len: number], Anonymize<Iei2mvq0mjvt81>>;
        /**
         * Query the output of the current `WeightToFee` given some input.
         */
        query_weight_to_fee: RuntimeDescriptor<[weight: Anonymize<I4q39t5hn830vp>], bigint>;
        /**
         * Query the output of the current `LengthToFee` given some input.
         */
        query_length_to_fee: RuntimeDescriptor<[length: number], bigint>;
    };
    /**
     * Runtime api to collect information about a collation.
     *
     * Version history:
     * - Version 2: Changed [`Self::collect_collation_info`] signature
     * - Version 3: Signals to the node to use version 1 of [`ParachainBlockData`].
     */
    CollectCollationInfo: {
        /**
         * Collect information about a collation.
         *
         * The given `header` is the header of the built block for that
         * we are collecting the collation info for.
         */
        collect_collation_info: RuntimeDescriptor<[header: Anonymize<Ic952bubvq4k7d>], Anonymize<Ic1d4u2opv3fst>>;
    };
    /**
     * Runtime API trait for statement validation.
     */
    ValidateStatement: {
        /**
         * Validate the statement.
         */
        validate_statement: RuntimeDescriptor<[source: Anonymize<Ico18ks790i2bl>, statement: Anonymize<I815pbp5omtss>], Anonymize<I3ju6ot8lfmk90>>;
    };
    /**
     * API to interact with `RuntimeGenesisConfig` for the runtime
     */
    GenesisBuilder: {
        /**
         * Build `RuntimeGenesisConfig` from a JSON blob not using any defaults and store it in the
         * storage.
         *
         * In the case of a FRAME-based runtime, this function deserializes the full
         * `RuntimeGenesisConfig` from the given JSON blob and puts it into the storage. If the
         * provided JSON blob is incorrect or incomplete or the deserialization fails, an error
         * is returned.
         *
         * Please note that provided JSON blob must contain all `RuntimeGenesisConfig` fields, no
         * defaults will be used.
         */
        build_state: RuntimeDescriptor<[json: Binary], Anonymize<Ie9sr1iqcg3cgm>>;
        /**
         * Returns a JSON blob representation of the built-in `RuntimeGenesisConfig` identified by
         * `id`.
         *
         * If `id` is `None` the function should return JSON blob representation of the default
         * `RuntimeGenesisConfig` struct of the runtime. Implementation must provide default
         * `RuntimeGenesisConfig`.
         *
         * Otherwise function returns a JSON representation of the built-in, named
         * `RuntimeGenesisConfig` preset identified by `id`, or `None` if such preset does not
         * exist. Returned `Vec<u8>` contains bytes of JSON blob (patch) which comprises a list of
         * (potentially nested) key-value pairs that are intended for customizing the default
         * runtime genesis config. The patch shall be merged (rfc7386) with the JSON representation
         * of the default `RuntimeGenesisConfig` to create a comprehensive genesis config that can
         * be used in `build_state` method.
         */
        get_preset: RuntimeDescriptor<[id: Anonymize<I1mqgk2tmnn9i2>], Anonymize<Iabpgqcjikia83>>;
        /**
         * Returns a list of identifiers for available builtin `RuntimeGenesisConfig` presets.
         *
         * The presets from the list can be queried with [`GenesisBuilder::get_preset`] method. If
         * no named presets are provided by the runtime the list is empty.
         */
        preset_names: RuntimeDescriptor<[], Anonymize<I6lr8sctk0bi4e>>;
    };
};
export type Stack_templateDispatchError = Anonymize<I33kjf48l20rf5>;
type IAsset = PlainDescriptor<void>;
export type Stack_templateExtensions = {
    "ChargeSponsored": {
        value: bigint;
    };
};
type PalletsTypedef = {
    __storage: IStorage;
    __tx: ICalls;
    __event: IEvent;
    __error: IError;
    __const: IConstants;
    __view: IViewFns;
};
export type Stack_template = {
    descriptors: {
        pallets: PalletsTypedef;
        apis: IRuntimeCalls;
    } & Promise<any>;
    metadataTypes: Promise<Uint8Array>;
    asset: IAsset;
    extensions: Stack_templateExtensions;
    getMetadata: () => Promise<Uint8Array>;
    genesis: string | undefined;
};
declare const _allDescriptors: Stack_template;
export default _allDescriptors;
export type Stack_templateApis = ApisFromDef<IRuntimeCalls>;
export type Stack_templateQueries = QueryFromPalletsDef<PalletsTypedef>;
export type Stack_templateCalls = TxFromPalletsDef<PalletsTypedef>;
export type Stack_templateEvents = EventsFromPalletsDef<PalletsTypedef>;
export type Stack_templateErrors = ErrorsFromPalletsDef<PalletsTypedef>;
export type Stack_templateConstants = ConstFromPalletsDef<PalletsTypedef>;
export type Stack_templateViewFns = ViewFnsFromPalletsDef<PalletsTypedef>;
export type Stack_templateCallData = Anonymize<Icmt859r8ealc1> & {
    value: {
        type: string;
    };
};
type AllInteractions = {
    storage: {
        System: ['Account', 'ExtrinsicCount', 'InherentsApplied', 'BlockWeight', 'AllExtrinsicsLen', 'BlockHash', 'ExtrinsicData', 'Number', 'ParentHash', 'Digest', 'Events', 'EventCount', 'EventTopics', 'LastRuntimeUpgrade', 'UpgradedToU32RefCount', 'UpgradedToTripleRefCount', 'ExecutionPhase', 'AuthorizedUpgrade', 'ExtrinsicWeightReclaimed'];
        ParachainSystem: ['UnincludedSegment', 'AggregatedUnincludedSegment', 'PendingValidationCode', 'NewValidationCode', 'ValidationData', 'DidSetValidationCode', 'LastRelayChainBlockNumber', 'UpgradeRestrictionSignal', 'UpgradeGoAhead', 'RelayStateProof', 'RelevantMessagingState', 'HostConfiguration', 'LastDmqMqcHead', 'LastHrmpMqcHeads', 'ProcessedDownwardMessages', 'LastProcessedDownwardMessage', 'HrmpWatermark', 'LastProcessedHrmpMessage', 'HrmpOutboundMessages', 'UpwardMessages', 'PendingUpwardMessages', 'PendingUpwardSignals', 'UpwardDeliveryFeeFactor', 'AnnouncedHrmpMessagesPerCandidate', 'ReservedXcmpWeightOverride', 'ReservedDmpWeightOverride', 'CustomValidationHeadData'];
        Timestamp: ['Now', 'DidUpdate'];
        ParachainInfo: ['ParachainId'];
        Balances: ['TotalIssuance', 'InactiveIssuance', 'Account', 'Locks', 'Reserves', 'Holds', 'Freezes'];
        TransactionPayment: ['NextFeeMultiplier', 'StorageVersion', 'TxPaymentCredit'];
        Sudo: ['Key'];
        Authorship: ['Author'];
        CollatorSelection: ['Invulnerables', 'CandidateList', 'LastAuthoredBlock', 'DesiredCandidates', 'CandidacyBond'];
        Session: ['Validators', 'CurrentIndex', 'QueuedChanged', 'QueuedKeys', 'DisabledValidators', 'NextKeys', 'KeyOwner', 'ExternallySetKeys'];
        Aura: ['Authorities', 'CurrentSlot'];
        AuraExt: ['Authorities', 'RelaySlotInfo'];
        XcmpQueue: ['InboundXcmpSuspended', 'OutboundXcmpStatus', 'OutboundXcmpMessages', 'SignalMessages', 'QueueConfig', 'QueueSuspended', 'DeliveryFeeFactor'];
        PolkadotXcm: ['QueryCounter', 'Queries', 'AssetTraps', 'SafeXcmVersion', 'SupportedVersion', 'VersionNotifiers', 'VersionNotifyTargets', 'VersionDiscoveryQueue', 'CurrentMigration', 'RemoteLockedFungibles', 'LockedFungibles', 'XcmExecutionSuspended', 'ShouldRecordXcm', 'RecordedXcm', 'AuthorizedAliases'];
        MessageQueue: ['BookStateFor', 'ServiceHead', 'Pages'];
        TemplatePallet: ['Claims'];
        SocialAppRegistry: ['NextAppId', 'Apps', 'AppsByOwner'];
        SocialProfiles: ['ProfileCount', 'Profiles'];
        SocialGraph: ['Follows', 'FollowerCount', 'FollowingCount'];
        SocialFeeds: ['NextPostId', 'Posts', 'PostsByAuthor', 'Replies', 'PostsTimeline', 'Unlocks', 'PendingUnlocks', 'KeyService'];
        Identity: ['IdentityOf', 'UsernameOf', 'SuperOf', 'SubsOf', 'Registrars', 'AuthorityOf', 'UsernameInfoOf', 'PendingUsernames', 'UnbindingUsernames'];
        SocialManagers: ['ProfileManagers', 'ManagerCount'];
        Sponsorship: ['SponsorOf', 'SponsorPots', 'BeneficiaryCount'];
    };
    tx: {
        System: ['remark', 'set_heap_pages', 'set_code', 'set_code_without_checks', 'set_storage', 'kill_storage', 'kill_prefix', 'remark_with_event', 'authorize_upgrade', 'authorize_upgrade_without_checks', 'apply_authorized_upgrade'];
        ParachainSystem: ['set_validation_data', 'sudo_send_upward_message'];
        Timestamp: ['set'];
        Balances: ['transfer_allow_death', 'force_transfer', 'transfer_keep_alive', 'transfer_all', 'force_unreserve', 'upgrade_accounts', 'force_set_balance', 'force_adjust_total_issuance', 'burn'];
        Sudo: ['sudo', 'sudo_unchecked_weight', 'set_key', 'sudo_as', 'remove_key'];
        CollatorSelection: ['set_invulnerables', 'set_desired_candidates', 'set_candidacy_bond', 'register_as_candidate', 'leave_intent', 'add_invulnerable', 'remove_invulnerable', 'update_bond', 'take_candidate_slot'];
        Session: ['set_keys', 'purge_keys'];
        XcmpQueue: ['suspend_xcm_execution', 'resume_xcm_execution', 'update_suspend_threshold', 'update_drop_threshold', 'update_resume_threshold'];
        PolkadotXcm: ['send', 'teleport_assets', 'reserve_transfer_assets', 'execute', 'force_xcm_version', 'force_default_xcm_version', 'force_subscribe_version_notify', 'force_unsubscribe_version_notify', 'limited_reserve_transfer_assets', 'limited_teleport_assets', 'force_suspension', 'transfer_assets', 'claim_assets', 'transfer_assets_using_type_and_then', 'add_authorized_alias', 'remove_authorized_alias', 'remove_all_authorized_aliases'];
        MessageQueue: ['reap_page', 'execute_overweight'];
        TemplatePallet: ['create_claim', 'revoke_claim'];
        SocialAppRegistry: ['register_app', 'deregister_app', 'act_as_moderator'];
        SocialProfiles: ['create_profile', 'update_metadata', 'delete_profile', 'set_follow_fee'];
        SocialGraph: ['follow', 'unfollow'];
        SocialFeeds: ['create_post', 'create_reply', 'unlock_post', 'set_key_service', 'deliver_unlock_unsigned', 'redact_post'];
        Identity: ['add_registrar', 'set_identity', 'set_subs', 'clear_identity', 'request_judgement', 'cancel_request', 'set_fee', 'set_account_id', 'set_fields', 'provide_judgement', 'kill_identity', 'add_sub', 'rename_sub', 'remove_sub', 'quit_sub', 'add_username_authority', 'remove_username_authority', 'set_username_for', 'accept_username', 'remove_expired_approval', 'set_primary_username', 'unbind_username', 'remove_username', 'kill_username'];
        SocialManagers: ['add_manager', 'remove_manager', 'remove_all_managers', 'act_as_manager'];
        Sponsorship: ['register_beneficiary', 'revoke_beneficiary', 'revoke_my_sponsor', 'top_up', 'withdraw'];
    };
    events: {
        System: ['ExtrinsicSuccess', 'ExtrinsicFailed', 'CodeUpdated', 'NewAccount', 'KilledAccount', 'Remarked', 'UpgradeAuthorized', 'RejectedInvalidAuthorizedUpgrade'];
        ParachainSystem: ['ValidationFunctionStored', 'ValidationFunctionApplied', 'ValidationFunctionDiscarded', 'DownwardMessagesReceived', 'DownwardMessagesProcessed', 'UpwardMessageSent'];
        Balances: ['Endowed', 'DustLost', 'Transfer', 'BalanceSet', 'Reserved', 'Unreserved', 'ReserveRepatriated', 'Deposit', 'Withdraw', 'Slashed', 'Minted', 'MintedCredit', 'Burned', 'BurnedDebt', 'Suspended', 'Restored', 'Upgraded', 'Issued', 'Rescinded', 'Locked', 'Unlocked', 'Frozen', 'Thawed', 'TotalIssuanceForced', 'Held', 'BurnedHeld', 'TransferOnHold', 'TransferAndHold', 'Released', 'Unexpected'];
        TransactionPayment: ['TransactionFeePaid'];
        Sudo: ['Sudid', 'KeyChanged', 'KeyRemoved', 'SudoAsDone'];
        CollatorSelection: ['NewInvulnerables', 'InvulnerableAdded', 'InvulnerableRemoved', 'NewDesiredCandidates', 'NewCandidacyBond', 'CandidateAdded', 'CandidateBondUpdated', 'CandidateRemoved', 'CandidateReplaced', 'InvalidInvulnerableSkipped'];
        Session: ['NewSession', 'NewQueued', 'ValidatorDisabled', 'ValidatorReenabled'];
        XcmpQueue: ['XcmpMessageSent'];
        PolkadotXcm: ['Attempted', 'Sent', 'SendFailed', 'ProcessXcmError', 'UnexpectedResponse', 'ResponseReady', 'Notified', 'NotifyOverweight', 'NotifyDispatchError', 'NotifyDecodeFailed', 'InvalidResponder', 'InvalidResponderVersion', 'ResponseTaken', 'AssetsTrapped', 'VersionChangeNotified', 'SupportedVersionChanged', 'NotifyTargetSendFail', 'NotifyTargetMigrationFail', 'InvalidQuerierVersion', 'InvalidQuerier', 'VersionNotifyStarted', 'VersionNotifyRequested', 'VersionNotifyUnrequested', 'FeesPaid', 'AssetsClaimed', 'VersionMigrationFinished', 'AliasAuthorized', 'AliasAuthorizationRemoved', 'AliasesAuthorizationsRemoved'];
        CumulusXcm: ['InvalidFormat', 'UnsupportedVersion', 'ExecutedDownward'];
        MessageQueue: ['ProcessingFailed', 'Processed', 'OverweightEnqueued', 'PageReaped'];
        Statement: ['NewStatement'];
        TemplatePallet: ['ClaimCreated', 'ClaimRevoked'];
        SocialAppRegistry: ['AppRegistered', 'AppDeregistered', 'ModeratorDispatched'];
        SocialProfiles: ['ProfileCreated', 'ProfileUpdated', 'FollowFeeUpdated', 'ProfileDeleted'];
        SocialGraph: ['Followed', 'Unfollowed'];
        SocialFeeds: ['PostCreated', 'ReplyCreated', 'PostUnlocked', 'PostRedacted', 'KeyServiceUpdated', 'UnlockKeyDelivered', 'AuthorSelfUnlockAcknowledged'];
        Identity: ['IdentitySet', 'IdentityCleared', 'IdentityKilled', 'JudgementRequested', 'JudgementUnrequested', 'JudgementGiven', 'RegistrarAdded', 'SubIdentityAdded', 'SubIdentitiesSet', 'SubIdentityRenamed', 'SubIdentityRemoved', 'SubIdentityRevoked', 'AuthorityAdded', 'AuthorityRemoved', 'UsernameSet', 'UsernameQueued', 'PreapprovalExpired', 'PrimaryUsernameSet', 'DanglingUsernameRemoved', 'UsernameUnbound', 'UsernameRemoved', 'UsernameKilled'];
        SocialManagers: ['ManagerAdded', 'ManagerRemoved', 'AllManagersRemoved', 'ActedAsManager', 'ExpiredManagerPurged'];
        Sponsorship: ['BeneficiaryRegistered', 'BeneficiaryRevoked', 'SponsorAbandoned', 'PotToppedUp', 'PotWithdrawn', 'FeeSponsored'];
    };
    errors: {
        System: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered', 'MultiBlockMigrationsOngoing', 'NothingAuthorized', 'Unauthorized'];
        ParachainSystem: ['OverlappingUpgrades', 'ProhibitedByPolkadot', 'TooBig', 'ValidationDataNotAvailable', 'HostConfigurationNotAvailable', 'NotScheduled'];
        Balances: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'Expendability', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves', 'TooManyHolds', 'TooManyFreezes', 'IssuanceDeactivated', 'DeltaZero'];
        Sudo: ['RequireSudo'];
        CollatorSelection: ['TooManyCandidates', 'TooFewEligibleCollators', 'AlreadyCandidate', 'NotCandidate', 'TooManyInvulnerables', 'AlreadyInvulnerable', 'NotInvulnerable', 'NoAssociatedValidatorId', 'ValidatorNotRegistered', 'InsertToCandidateListFailed', 'RemoveFromCandidateListFailed', 'DepositTooLow', 'UpdateCandidateListFailed', 'InsufficientBond', 'TargetIsNotCandidate', 'IdenticalDeposit', 'InvalidUnreserve'];
        Session: ['InvalidProof', 'NoAssociatedValidatorId', 'DuplicatedKey', 'NoKeys', 'NoAccount'];
        XcmpQueue: ['BadQueueConfig', 'AlreadySuspended', 'AlreadyResumed', 'TooManyActiveOutboundChannels', 'TooBig'];
        PolkadotXcm: ['Unreachable', 'SendFailure', 'Filtered', 'UnweighableMessage', 'DestinationNotInvertible', 'Empty', 'CannotReanchor', 'TooManyAssets', 'InvalidOrigin', 'BadVersion', 'BadLocation', 'NoSubscription', 'AlreadySubscribed', 'CannotCheckOutTeleport', 'LowBalance', 'TooManyLocks', 'AccountNotSovereign', 'FeesNotMet', 'LockNotFound', 'InUse', 'InvalidAssetUnknownReserve', 'InvalidAssetUnsupportedReserve', 'TooManyReserves', 'LocalExecutionIncomplete', 'TooManyAuthorizedAliases', 'ExpiresInPast', 'AliasNotFound', 'LocalExecutionIncompleteWithError'];
        MessageQueue: ['NotReapable', 'NoPage', 'NoMessage', 'AlreadyProcessed', 'Queued', 'InsufficientWeight', 'TemporarilyUnprocessable', 'QueuePaused', 'RecursiveDisallowed'];
        TemplatePallet: ['AlreadyClaimed', 'NotClaimOwner', 'ClaimNotFound'];
        SocialAppRegistry: ['InsufficientBond', 'AppNotFound', 'NotAppOwner', 'AppAlreadyInactive', 'TooManyApps', 'MetadataTooLong', 'AppIdOverflow'];
        SocialProfiles: ['ProfileAlreadyExists', 'ProfileNotFound', 'InsufficientBond', 'MetadataTooLong'];
        SocialGraph: ['ProfileNotFound', 'CannotFollowSelf', 'AlreadyFollowing', 'NotFollowing', 'InsufficientBalance'];
        SocialFeeds: ['ProfileNotFound', 'AppNotFound', 'ParentPostNotFound', 'InsufficientBalance', 'ContentTooLong', 'TooManyPosts', 'TooManyReplies', 'PostIdOverflow', 'PostNotFound', 'AlreadyUnlocked', 'PostIsPublic', 'PostNotInApp', 'AlreadyRedacted', 'CapsuleInvalid', 'InvalidBuyerPk', 'KeyServiceNotConfigured', 'WrappedKeyInvalid', 'UnlockNotPending'];
        Identity: ['TooManySubAccounts', 'NotFound', 'NotNamed', 'EmptyIndex', 'FeeChanged', 'NoIdentity', 'StickyJudgement', 'JudgementGiven', 'InvalidJudgement', 'InvalidIndex', 'InvalidTarget', 'TooManyRegistrars', 'AlreadyClaimed', 'NotSub', 'NotOwned', 'JudgementForDifferentIdentity', 'JudgementPaymentFailed', 'InvalidSuffix', 'NotUsernameAuthority', 'NoAllocation', 'InvalidSignature', 'RequiresSignature', 'InvalidUsername', 'UsernameTaken', 'NoUsername', 'NotExpired', 'TooEarly', 'NotUnbinding', 'AlreadyUnbinding', 'InsufficientPrivileges'];
        SocialManagers: ['ManagerNotFound', 'ManagerAlreadyExists', 'TooManyManagers', 'ManagerExpired', 'ScopeNotAuthorized', 'CallNotDelegatable', 'EmptyScopeSet', 'ExpirationInPast', 'InsufficientDeposit', 'ManagerCannotBeSelf'];
        Sponsorship: ['CannotSponsorSelf', 'NoActiveSponsor', 'NotYourBeneficiary', 'InsufficientFunds', 'WithdrawalExceedsPot', 'PotAccountingMismatch'];
    };
    constants: {
        System: ['BlockWeights', 'BlockLength', 'BlockHashCount', 'DbWeight', 'Version', 'SS58Prefix'];
        ParachainSystem: ['SelfParaId'];
        Timestamp: ['MinimumPeriod'];
        Balances: ['ExistentialDeposit', 'MaxLocks', 'MaxReserves', 'MaxFreezes'];
        TransactionPayment: ['OperationalFeeMultiplier'];
        CollatorSelection: ['PotId', 'MaxCandidates', 'MinEligibleCollators', 'MaxInvulnerables', 'KickThreshold', 'pot_account'];
        Session: ['KeyDeposit'];
        Aura: ['SlotDuration'];
        XcmpQueue: ['MaxInboundSuspended', 'MaxActiveOutboundChannels', 'MaxPageSize'];
        PolkadotXcm: ['UniversalLocation', 'AdvertisedXcmVersion', 'MaxLockers', 'MaxRemoteLockConsumers'];
        MessageQueue: ['HeapSize', 'MaxStale', 'ServiceWeight', 'IdleMaxServiceWeight'];
        Statement: ['StatementCost', 'ByteCost', 'MinAllowedStatements', 'MaxAllowedStatements', 'MinAllowedBytes', 'MaxAllowedBytes'];
        SocialAppRegistry: ['AppBond', 'MaxMetadataLen', 'MaxAppsPerOwner'];
        SocialProfiles: ['ProfileBond', 'MaxMetadataLen'];
        SocialFeeds: ['PostFee', 'MaxContentLen', 'MaxPostsPerAuthor', 'MaxRepliesPerPost', 'UnsignedValidityWindow', 'UnsignedPriority'];
        Identity: ['BasicDeposit', 'ByteDeposit', 'UsernameDeposit', 'SubAccountDeposit', 'MaxSubAccounts', 'MaxRegistrars', 'PendingUsernameExpiration', 'UsernameGracePeriod', 'MaxSuffixLength', 'MaxUsernameLength'];
        SocialManagers: ['ManagerDepositBase', 'MaxManagersPerOwner', 'MaxExpiryPurgePerBlock', 'MaxExpiryScanPerBlock'];
        Sponsorship: ['MinimumPotBalance'];
    };
    viewFns: {
        SocialFeeds: ['post_by_id', 'author_post_count', 'feed_by_author'];
    };
    apis: {
        AuraApi: ['slot_duration', 'authorities'];
        AuraUnincludedSegmentApi: ['can_build_upon'];
        Core: ['version', 'execute_block', 'initialize_block'];
        Metadata: ['metadata', 'metadata_at_version', 'metadata_versions'];
        RuntimeViewFunction: ['execute_view_function'];
        BlockBuilder: ['apply_extrinsic', 'finalize_block', 'inherent_extrinsics', 'check_inherents'];
        TaggedTransactionQueue: ['validate_transaction'];
        OffchainWorkerApi: ['offchain_worker'];
        SessionKeys: ['generate_session_keys', 'decode_session_keys'];
        AccountNonceApi: ['account_nonce'];
        TransactionPaymentApi: ['query_info', 'query_fee_details', 'query_weight_to_fee', 'query_length_to_fee'];
        TransactionPaymentCallApi: ['query_call_info', 'query_call_fee_details', 'query_weight_to_fee', 'query_length_to_fee'];
        CollectCollationInfo: ['collect_collation_info'];
        ValidateStatement: ['validate_statement'];
        GenesisBuilder: ['build_state', 'get_preset', 'preset_names'];
    };
};
export type Stack_templateWhitelistEntry = PalletKey | `query.${NestedKey<AllInteractions['storage']>}` | `tx.${NestedKey<AllInteractions['tx']>}` | `event.${NestedKey<AllInteractions['events']>}` | `error.${NestedKey<AllInteractions['errors']>}` | `const.${NestedKey<AllInteractions['constants']>}` | `view.${NestedKey<AllInteractions['viewFns']>}` | `api.${NestedKey<AllInteractions['apis']>}`;
type PalletKey = `*.${({
    [K in keyof AllInteractions]: K extends 'apis' ? never : keyof AllInteractions[K];
})[keyof AllInteractions]}`;
type NestedKey<D extends Record<string, string[]>> = "*" | {
    [P in keyof D & string]: `${P}.*` | `${P}.${D[P][number]}`;
}[keyof D & string];
