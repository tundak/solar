import BigNumber from "big.js"
import React from "react"
import { Asset, Operation, Transaction } from "stellar-sdk"
import HumanTime from "react-human-time"
import Collapse from "@material-ui/core/Collapse"
import List from "@material-ui/core/List"
import ListItem from "@material-ui/core/ListItem"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import ListItemText from "@material-ui/core/ListItemText"
import ListSubheader from "@material-ui/core/ListSubheader"
import Tooltip from "@material-ui/core/Tooltip"
import { makeStyles } from "@material-ui/core/styles"
import AddIcon from "@material-ui/icons/Add"
import CallMadeIcon from "@material-ui/icons/CallMade"
import CallReceivedIcon from "@material-ui/icons/CallReceived"
import RemoveIcon from "@material-ui/icons/Remove"
import SettingsIcon from "@material-ui/icons/Settings"
import SwapHorizIcon from "@material-ui/icons/SwapHoriz"
import { Account } from "../../context/accounts"
import { SettingsContext } from "../../context/settings"
import { useIsMobile, useRouter } from "../../hooks/userinterface"
import * as routes from "../../routes"
import { getPaymentSummary, PaymentSummary } from "../../lib/paymentSummary"
import { createCheapTxID } from "../../lib/transaction"
import { breakpoints } from "../../theme"
import { PublicKey } from "../PublicKey"
import MemoMessage from "../Stellar/MemoMessage"
import TransactionReviewDialog from "../TransactionReview/TransactionReviewDialog"
import { getOperationTitle } from "../TransactionReview/Operations"
import { formatBalance, SingleBalance } from "./AccountBalances"
import { matchesRoute } from "../../lib/routes"

type TransactionWithUndocumentedProps = Transaction & {
  created_at: string
}

const dedupe = <T extends any>(array: T[]): T[] => Array.from(new Set(array))
const doNothing = () => undefined

function sum(...amounts: Array<string | number | BigNumber>): BigNumber {
  return amounts.reduce<BigNumber>((total, amount) => total.add(amount), BigNumber(0))
}

function EntryAnimation(props: { children: React.ReactNode; animate: boolean }) {
  return props.animate ? (
    <Collapse appear enter={false} in timeout={{ enter: 1000 }}>
      {props.children}
    </Collapse>
  ) : (
    <React.Fragment>{props.children}</React.Fragment>
  )
}

function OfferDescription(props: {
  amount: BigNumber
  buying: Asset
  offerId: string
  price: BigNumber
  selling: Asset
  type: Operation.ManageBuyOffer["type"] | Operation.ManageSellOffer["type"]
}) {
  const { amount, buying, offerId, price, selling } = props
  let prefix: string

  if (amount.eq(0)) {
    return (
      <>
        Delete offer: Sell {selling.code} for {buying.code}
      </>
    )
  }

  if (offerId === "0") {
    prefix = "Order: "
  } else if (amount.eq(0)) {
    prefix = "Cancel order: "
  } else {
    prefix = "Update order: "
  }

  return (
    <>
      {prefix}
      {props.type === "manageBuyOffer"
        ? `Buy ${formatBalance(amount.toString())} ${buying.code} for ${formatBalance(amount.div(price).toString())} ${
            selling.code
          }`
        : `Sell ${formatBalance(amount.toString())} ${selling.code} for ${formatBalance(
            amount.mul(price).toString()
          )} ${buying.code}`}
    </>
  )
}

function RemotePublicKeys(props: { publicKeys: string[]; short?: boolean }) {
  if (props.publicKeys.length === 0) {
    return <>-</>
  } else if (props.publicKeys.length === 1) {
    return <PublicKey publicKey={props.publicKeys[0]} variant={props.short ? "short" : "full"} />
  } else {
    return (
      <>
        <PublicKey publicKey={props.publicKeys[0]} variant="short" /> <i>+ {props.publicKeys.length - 1} more</i>
      </>
    )
  }
}

function Time(props: { time: string }) {
  const { localeString, unixTime } = React.useMemo(() => {
    // Turns out that this takes more time than expected
    const date = new Date(props.time)
    return {
      localeString: date.toLocaleString(),
      unixTime: date.getTime()
    }
  }, [props.time])
  return (
    <Tooltip title={<span style={{ fontSize: "110%" }}>{localeString}</span>}>
      <span style={{ whiteSpace: "nowrap" }}>
        <HumanTime time={unixTime} />
      </span>
    </Tooltip>
  )
}

function TransactionIcon(props: { paymentSummary: PaymentSummary; transaction: Transaction }) {
  if (
    props.transaction.operations.length === 1 &&
    ["manageBuyOffer", "manageSellOffer"].includes(props.transaction.operations[0].type)
  ) {
    return <SwapHorizIcon />
  } else if (props.transaction.operations.length === 1 && props.transaction.operations[0].type === "changeTrust") {
    return BigNumber(props.transaction.operations[0].limit).eq(0) ? <RemoveIcon /> : <AddIcon />
  } else if (props.transaction.operations.every(operation => operation.type === "accountMerge")) {
    return <CallReceivedIcon />
  } else if (props.paymentSummary.length === 0) {
    return <SettingsIcon />
  } else if (props.paymentSummary.every(summaryItem => summaryItem.balanceChange.gt(0))) {
    return <CallReceivedIcon />
  } else if (props.paymentSummary.every(summaryItem => summaryItem.balanceChange.lt(0))) {
    return <CallMadeIcon />
  } else {
    return <SwapHorizIcon />
  }
}

interface TitleTextProps {
  accountPublicKey: string
  alwaysShowSource?: boolean
  createdAt: string
  paymentSummary: PaymentSummary
  style?: React.CSSProperties
  showMemo: boolean
  transaction: Transaction
}

// TODO: Re-use code of transaction summary operation heading
// tslint:disable-next-line no-shadowed-variable
const TransactionItemText = React.memo(function TransactionItemText(props: TitleTextProps) {
  const remotePublicKeys = props.paymentSummary.reduce(
    (pubKeys, summaryItem) => pubKeys.concat(summaryItem.publicKeys),
    [] as string[]
  )

  const secondary = React.useMemo(
    () => (
      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
        <Time time={props.createdAt} />
        {props.showMemo && props.transaction.memo.type !== "none" ? (
          <>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <MemoMessage prefix={<>Memo:&nbsp;</>} memo={props.transaction.memo} />
          </>
        ) : null}
      </span>
    ),
    [props.createdAt, props.showMemo, props.transaction]
  )

  if (remotePublicKeys.length > 0 && props.paymentSummary.every(summaryItem => summaryItem.balanceChange.gt(0))) {
    return (
      <ListItemText
        primary={
          <span>
            From&nbsp;
            <RemotePublicKeys publicKeys={remotePublicKeys} short />
          </span>
        }
        primaryTypographyProps={{ style: props.style }}
        secondary={secondary}
        style={props.style}
      />
    )
  } else if (
    remotePublicKeys.length > 0 &&
    props.paymentSummary.every(summaryItem => summaryItem.balanceChange.lt(0))
  ) {
    return (
      <ListItemText
        primary={
          <span>
            To&nbsp;
            <RemotePublicKeys publicKeys={remotePublicKeys} short />
            {props.alwaysShowSource ? (
              <span>
                &nbsp;from&nbsp;
                <PublicKey publicKey={props.accountPublicKey} variant="short" />{" "}
              </span>
            ) : null}
          </span>
        }
        primaryTypographyProps={{ style: props.style }}
        secondary={secondary}
        style={props.style}
      />
    )
  } else if (props.transaction.operations.length === 1 && props.transaction.operations[0].type === "changeTrust") {
    const operation = props.transaction.operations[0] as Operation.ChangeTrust

    return BigNumber(operation.limit).eq(0) ? (
      <ListItemText
        primary={
          <span>
            Remove trust in asset {operation.line.code}
            {props.alwaysShowSource ? (
              <>
                {" "}
                (<PublicKey publicKey={props.accountPublicKey} variant="short" />)
              </>
            ) : null}
          </span>
        }
        primaryTypographyProps={{ style: props.style }}
        secondary={secondary}
        style={props.style}
      />
    ) : (
      <ListItemText
        primary={
          <span>
            Trust asset {operation.line.code}
            {props.alwaysShowSource ? (
              <>
                {" "}
                (<PublicKey publicKey={props.accountPublicKey} variant="short" />)
              </>
            ) : null}
          </span>
        }
        primaryTypographyProps={{ style: props.style }}
        secondary={secondary}
        style={props.style}
      />
    )
  } else if (
    props.transaction.operations.length === 1 &&
    ["manageBuyOffer", "manageSellOffer"].includes(props.transaction.operations[0].type)
  ) {
    const operation = props.transaction.operations[0] as Operation.ManageBuyOffer | Operation.ManageSellOffer
    const amount = BigNumber(operation.type === "manageBuyOffer" ? operation.buyAmount : operation.amount)

    if (String(operation.offerId) === "0") {
      // Create offer
      return (
        <ListItemText
          primary={
            <span>
              <OfferDescription {...operation} amount={amount} price={BigNumber(operation.price)} />
              {props.alwaysShowSource ? (
                <>
                  {" "}
                  (<PublicKey publicKey={props.accountPublicKey} variant="short" />)
                </>
              ) : null}
            </span>
          }
          primaryTypographyProps={{ style: props.style }}
          secondary={secondary}
          style={props.style}
        />
      )
    } else if (amount.eq(0)) {
      // Delete offer
      return (
        <ListItemText
          primary={
            <span>
              <OfferDescription {...operation} amount={BigNumber(0)} price={BigNumber(operation.price)} />
              {props.alwaysShowSource ? (
                <>
                  {" "}
                  (<PublicKey publicKey={props.accountPublicKey} variant="short" />)
                </>
              ) : null}
            </span>
          }
          primaryTypographyProps={{ style: props.style }}
          secondary={secondary}
          style={props.style}
        />
      )
    } else {
      // Update offer
      return (
        <ListItemText
          primary={
            <span>
              <OfferDescription {...operation} amount={amount} price={BigNumber(operation.price)} />
              {props.alwaysShowSource ? (
                <>
                  {" "}
                  (<PublicKey publicKey={props.accountPublicKey} variant="short" />)
                </>
              ) : null}
            </span>
          }
          primaryTypographyProps={{ style: props.style }}
          secondary={secondary}
          style={props.style}
        />
      )
    }
  } else {
    const formattedOperations = props.transaction.operations.map(getOperationTitle)
    return (
      <ListItemText
        primary={<span>{dedupe(formattedOperations).join(", ")}</span>}
        primaryTypographyProps={{ style: props.style }}
        secondary={secondary}
        style={props.style}
      />
    )
  }
})

function TransactionListItemBalance(props: {
  accountPublicKey: string
  paymentSummary: PaymentSummary
  style?: React.CSSProperties
  transaction: Transaction
}) {
  const { paymentSummary } = props
  const isSmallScreen = useIsMobile()

  const creationOps = props.transaction.operations.filter(
    (op): op is Operation.CreateAccount => op.type === "createAccount"
  )
  const paymentOps = props.transaction.operations.filter((op): op is Operation.Payment => op.type === "payment")

  // Handle special edge case: Sending money from an account to itself
  const balanceChange = paymentSummary.every(payment =>
    payment.publicKeys.every(pubkey => pubkey === props.accountPublicKey)
  )
    ? sum(...creationOps.map(op => op.startingBalance), ...paymentOps.map(op => op.amount))
    : paymentSummary[0].balanceChange

  return (
    <ListItemText primaryTypographyProps={{ align: "right" }} style={{ flexShrink: 0, ...props.style }}>
      {paymentSummary.length === 0 ? null : (
        <SingleBalance
          assetCode={paymentSummary[0].asset.getCode()}
          balance={balanceChange.toString()}
          style={isSmallScreen ? { fontSize: "1rem" } : { fontSize: "1.4rem" }}
        />
      )}
    </ListItemText>
  )
}

interface TransactionListItemProps {
  accountPublicKey: string
  alwaysShowSource?: boolean
  className?: string
  createdAt: string
  icon?: React.ReactElement<any>
  onOpenTransaction?: (transaction: Transaction) => void
  style?: React.CSSProperties
  transaction: Transaction
}

// tslint:disable-next-line no-shadowed-variable
export const TransactionListItem = React.memo(function TransactionListItem(props: TransactionListItemProps) {
  const { hideMemos } = React.useContext(SettingsContext)

  const isSmallScreen = useIsMobile()
  const paymentSummary = getPaymentSummary(props.accountPublicKey, props.transaction)

  const { onOpenTransaction, transaction } = props
  const onOpen = onOpenTransaction ? () => onOpenTransaction(transaction) : undefined

  return (
    <ListItem button={Boolean(onOpen) as any} className={props.className || ""} onClick={onOpen} style={props.style}>
      <ListItemIcon style={{ marginRight: isSmallScreen ? 0 : undefined }}>
        {props.icon || <TransactionIcon paymentSummary={paymentSummary} transaction={props.transaction} />}
      </ListItemIcon>
      <TransactionItemText
        accountPublicKey={props.accountPublicKey}
        alwaysShowSource={props.alwaysShowSource}
        createdAt={props.createdAt}
        paymentSummary={paymentSummary}
        showMemo={!hideMemos}
        style={{
          fontSize: isSmallScreen ? "0.8rem" : undefined,
          fontWeight: "bold",
          overflow: "hidden",
          paddingRight: 0,
          textOverflow: "ellipsis"
        }}
        transaction={props.transaction}
      />
      <TransactionListItemBalance
        accountPublicKey={props.accountPublicKey}
        paymentSummary={paymentSummary}
        style={{ paddingRight: 0 }}
        transaction={props.transaction}
      />
    </ListItem>
  )
})

const useTransactionListStyles = makeStyles({
  listItem: {
    padding: "8px 24px",

    [breakpoints.down(600)]: {
      paddingLeft: 24,
      paddingRight: 24
    }
  }
})

interface TransactionListProps {
  account: Account
  background?: React.CSSProperties["background"]
  testnet: boolean
  title: React.ReactNode
  transactions: Transaction[]
}

function TransactionList(props: TransactionListProps) {
  const classes = useTransactionListStyles(props)
  const isSmallScreen = useIsMobile()
  const router = useRouter()

  const openedTxHash = matchesRoute(router.location.pathname, routes.showTransaction("*", "*"))
    ? (router.match.params as { id: string; subaction: string }).subaction
    : null

  const openedTransaction = openedTxHash
    ? props.transactions.find(recentTx => recentTx.hash().toString("hex") === openedTxHash) || null
    : null

  const openTransaction = React.useCallback(
    (transaction: Transaction) => {
      router.history.push(routes.showTransaction(props.account.id, transaction.hash().toString("hex")))
    },
    [props.account, router]
  )

  const closeTransaction = React.useCallback(() => {
    router.history.push(routes.account(props.account.id))

    // A little hack to prevent :focus style being set again on list item after closing the dialog
    setTimeout(() => {
      if (document.activeElement) {
        ;(document.activeElement as HTMLElement).blur()
      }
    }, 0)
  }, [])

  const transactionListItems = React.useMemo(
    () => (
      <>
        {(props.transactions as TransactionWithUndocumentedProps[]).map(transaction => (
          <EntryAnimation
            key={createCheapTxID(transaction)}
            // Animate only if it's a new tx, not if we just haven't rendered it before
            animate={Date.now() - new Date(transaction.created_at).getTime() < 10_000}
          >
            <TransactionListItem
              key={createCheapTxID(transaction)}
              accountPublicKey={props.account.publicKey}
              className={classes.listItem}
              createdAt={transaction.created_at}
              transaction={transaction}
              onOpenTransaction={openTransaction}
            />
          </EntryAnimation>
        ))}
      </>
    ),
    [props.account, props.transactions, openTransaction]
  )

  if (props.transactions.length === 0) {
    return null
  }

  return (
    <List disablePadding={isSmallScreen} style={{ background: props.background }}>
      <ListSubheader className={classes.listItem} disableSticky style={{ background: props.background }}>
        {props.title}
      </ListSubheader>
      {transactionListItems}
      <TransactionReviewDialog
        open={openedTransaction !== null}
        account={props.account}
        disabled={true}
        showSource
        showSubmissionProgress={false}
        transaction={openedTransaction}
        onClose={closeTransaction}
        onSubmitTransaction={doNothing}
      />
    </List>
  )
}

export default React.memo(TransactionList)
