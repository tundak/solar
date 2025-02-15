import React from "react"
import { Asset, Server, Transaction } from "stellar-sdk"
import { Account } from "../../context/accounts"
import { trackError } from "../../context/notifications"
import { useLiveAccountData, ObservedAccountData } from "../../hooks/stellar-subscriptions"
import { useDialogActions } from "../../hooks/userinterface"
import { getAssetsFromBalances } from "../../lib/stellar"
import ScrollableBalances from "../AccountAssets/ScrollableBalances"
import DialogBody from "../Dialog/DialogBody"
import TestnetBadge from "../Dialog/TestnetBadge"
import { Box } from "../Layout/Box"
import MainTitle from "../MainTitle"
import TransactionSender from "../TransactionSender"
import CreatePaymentForm from "./CreatePaymentForm"

interface Props {
  account: Account
  accountData: ObservedAccountData
  horizon: Server
  onClose: () => void
  sendTransaction: (transaction: Transaction) => Promise<any>
}

function CreatePaymentDialog(props: Props) {
  const dialogActionsRef = useDialogActions()
  const [txCreationPending, setTxCreationPending] = React.useState(false)

  const handleSubmit = React.useCallback(
    async (createTx: (horizon: Server, account: Account) => Promise<Transaction>) => {
      try {
        setTxCreationPending(true)
        const tx = await createTx(props.horizon, props.account)
        setTxCreationPending(false)
        await props.sendTransaction(tx)
      } catch (error) {
        trackError(error)
      } finally {
        setTxCreationPending(false)
      }
    },
    [props.account, props.horizon]
  )

  const trustedAssets = React.useMemo(() => getAssetsFromBalances(props.accountData.balances) || [Asset.native()], [
    props.accountData.balances
  ])

  return (
    <DialogBody
      top={
        <>
          <MainTitle
            title={<span>Send funds {props.account.testnet ? <TestnetBadge style={{ marginLeft: 8 }} /> : null}</span>}
            onBack={props.onClose}
          />
          <ScrollableBalances account={props.account} compact />
        </>
      }
      actions={dialogActionsRef}
    >
      <Box margin="24px 0 0">{null}</Box>
      <CreatePaymentForm
        accountData={props.accountData}
        actionsRef={dialogActionsRef}
        onCancel={props.onClose}
        onSubmit={handleSubmit}
        testnet={props.account.testnet}
        trustedAssets={trustedAssets}
        txCreationPending={txCreationPending}
      />
    </DialogBody>
  )
}

function ConnectedCreatePaymentDialog(props: Pick<Props, "account" | "onClose">) {
  const accountData = useLiveAccountData(props.account.publicKey, props.account.testnet)
  const closeAfterTimeout = () => {
    // Close automatically a second after successful submission
    setTimeout(() => props.onClose(), 1000)
  }
  return (
    <TransactionSender account={props.account} onSubmissionCompleted={closeAfterTimeout}>
      {({ horizon, sendTransaction }) => (
        <CreatePaymentDialog {...props} accountData={accountData} horizon={horizon} sendTransaction={sendTransaction} />
      )}
    </TransactionSender>
  )
}

export default ConnectedCreatePaymentDialog
