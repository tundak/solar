import React from "react"
import { Transaction } from "stellar-sdk"
import ListSubheader from "@material-ui/core/ListSubheader"
import { Account } from "../../context/accounts"
import { SignatureRequest } from "../../lib/multisig-service"
import { List } from "../List"
import { TransactionListItem } from "./TransactionList"
import TransactionSender from "../TransactionSender"

interface SignatureRequestListItemProps {
  account: Account
  icon?: React.ReactElement<any>
  onOpenTransaction?: (account: Account, tx: Transaction, signatureRequest: SignatureRequest) => void
  signatureRequest: SignatureRequest
  style?: React.CSSProperties
}

function SignatureRequestListItem(props: SignatureRequestListItemProps) {
  const { onOpenTransaction, signatureRequest } = props

  const openTransaction = React.useCallback(
    onOpenTransaction
      ? () => onOpenTransaction(props.account, signatureRequest.meta.transaction, signatureRequest)
      : () => undefined,
    [onOpenTransaction, signatureRequest]
  )

  return (
    <TransactionListItem
      alwaysShowSource
      accountPublicKey={signatureRequest.meta.transaction.source}
      createdAt={signatureRequest.created_at}
      icon={props.icon}
      onOpenTransaction={openTransaction}
      style={props.style}
      transaction={signatureRequest.meta.transaction}
    />
  )
}

interface SignatureRequestListProps {
  account: Account
  icon?: React.ReactElement<any>
  onOpenTransaction?: (account: Account, transaction: Transaction, signatureRequest: SignatureRequest) => void
  signatureRequests: SignatureRequest[]
  title: React.ReactNode
}

// tslint:disable-next-line no-shadowed-variable
export const SignatureRequestList = React.memo(function SignatureRequestList(props: SignatureRequestListProps) {
  if (props.signatureRequests.length === 0) {
    return null
  }
  return (
    <>
      <List style={{ background: "transparent" }}>
        <ListSubheader disableSticky style={{ background: "transparent" }}>
          {props.title}
        </ListSubheader>
        {props.signatureRequests.map(signatureRequest => (
          <SignatureRequestListItem
            key={signatureRequest.hash}
            account={props.account}
            icon={props.icon}
            onOpenTransaction={props.onOpenTransaction}
            signatureRequest={signatureRequest}
            style={{
              minHeight: 72
            }}
          />
        ))}
      </List>
    </>
  )
})

export const InteractiveSignatureRequestList = React.memo(
  (props: {
    account: Account
    icon?: React.ReactElement<any>
    signatureRequests: SignatureRequest[]
    title: React.ReactNode
  }) => {
    if (props.signatureRequests.length === 0) {
      return null
    }
    return (
      <TransactionSender testnet={props.account.testnet}>
        {({ sendTransaction }) => (
          <SignatureRequestList
            account={props.account}
            icon={props.icon}
            onOpenTransaction={sendTransaction}
            signatureRequests={props.signatureRequests}
            title={props.title}
          />
        )}
      </TransactionSender>
    )
  }
)
