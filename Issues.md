
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

## i2
After clicking claim on the ben account with all the correct details , metamask pops up and says this message:
`
Sending assets to burn address
You're sending your assets to a burn address. If you continue, you'll lose your assets.
`

and got this in the UI 
`
User rejected the request. Request Arguments: from: 0x1f3391e747327f0b5f6e505b944c6ffb67e4a87f to: 0x0000000000000000000000000000000000000000 data: 0x44d1ecaa2b22a478eb14040a93806cb29076455cda96f1934089a97d84fcd43bafe3195f00000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 Contract Call: address: 0x0000000000000000000000000000000000000000 function: claim(bytes32 willCommitment, uint256 ethAmount, uint256 usdcAmount, uint256 leafIndex, bytes32[3] siblings) args: (0x2b22a478eb14040a93806cb29076455cda96f1934089a97d84fcd43bafe3195f, 1000000000000000, 0, 0, ["0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000000000000000000000000000"]) sender: 0x1f3391e747327f0b5f6e505b944c6ffb67e4a87f Docs: https://viem.sh/docs/contract/writeContract Details: MetaMask Tx Signature: User denied transaction signature. Version: viem@2.37.8
`

I basically cant claim , and the amount is sending to burn address 

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

