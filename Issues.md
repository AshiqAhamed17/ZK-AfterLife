
# Issues

## i1
In the /execute page , if i try to Trigger Grace period , it shows this error message 

`
The contract function "triggerGracePeriod" reverted with the following reason: RPC 0xaa36a7 Infura eth_sendRawTransaction: gas limit too high Contract Call: address: 0xe5D88E1E866C79AC9EA38716DeB3C83e0793D510 function: triggerGracePeriod(bytes32 willCommitment) args: (0x0341ea3cb540bd26a71462d119cb59c975839c6763977dda4c261305a65ed993) sender: 0xb5a55d323d351b23ac154ff515be6cb98a0349b2 Docs: https://viem.sh/docs/contract/writeContract Version: viem@2.37.8
`
and its doesn't trigger a grace period 

and when i go back to checkin page the same error shows in the page , which should not

`
Liveness
Due soon
Next check-in due in
4 hours, 41 minutes
The contract function "triggerGracePeriod" reverted with the following reason: RPC 0xaa36a7 Infura eth_sendRawTransaction: transaction gas limit too high (cap: 16777216, tx: 21000000) Contract Call: address: 0xe5D88E1E866C79AC9EA38716DeB3C83e0793D510 function: triggerGracePeriod(bytes32 willCommitment) args: (0x0341ea3cb540bd26a71462d119cb59c975839c6763977dda4c261305a65ed993) sender: 0xb5a55d323d351b23ac154ff515be6cb98a0349b2 Docs: https://viem.sh/docs/contract/writeContract Version: viem@2.37.8
`
Its gone only if i refresh,


## UI fixes 

IN after registering a will , the it shows

`
Your will is sealed.
The commitment is on-chain; your plan stays private until execution.

Commitment · keep this safe
0x0341ea3cb540bd26a71462d119cb59c975839c6763977dda4c261305a65ed993


You'll need this commitment, your will salt (uwbpc1z50a), and the same description and beneficiary details to execute this will later — the chain never stores them.
`

As you can see the will salt is not much visible , its small so users might unsee it and move to next steps , so make it more visual like the commitment

---

