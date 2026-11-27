import { AbiCoder, Interface, keccak256 } from 'ethers';

const transfers = new Interface(['event Transfer(address indexed from,address indexed to,uint256 amount)']);

export function originPaycheckId(receipt, chainId, token, recipient, amount) {
  const logs = receipt.logs.filter(log => {
    if (log.address.toLowerCase() !== token.toLowerCase()) return false;
    const event = transfers.parseLog(log);
    return event?.name === 'Transfer' && event.args.to.toLowerCase() === recipient.toLowerCase()
      && event.args.amount === amount;
  });
  if (logs.length !== 1) throw new Error('Cannot identify a unique paycheck transfer in the origin receipt');
  return keccak256(AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'bytes32', 'uint256'], [chainId, receipt.hash, logs[0].index]
  ));
}
