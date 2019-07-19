import React from "react"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import ListItemText from "@material-ui/core/ListItemText"
import Menu from "@material-ui/core/Menu"
import MenuItem from "@material-ui/core/MenuItem"
import CallMadeIcon from "@material-ui/icons/CallMade"
import MoneyIcon from "@material-ui/icons/AttachMoney"
import SettingsIcon from "@material-ui/icons/SettingsOutlined"
import SwapHorizIcon from "@material-ui/icons/SwapHoriz"
import { Account } from "../../context/accounts"
import { SettingsContextType } from "../../context/settings"
import ContextMenu, { AnchorRenderProps } from "../ContextMenu"

interface ItemProps {
  disabled?: boolean
  hidden?: boolean
  icon: React.ReactElement<any>
  label: string
  onClick: () => void
}

const AccountContextMenuItem = React.forwardRef((props: ItemProps, ref) => {
  if (props.hidden) {
    return null
  }
  return (
    <MenuItem disabled={props.disabled} onClick={props.onClick}>
      <ListItemIcon style={{ marginRight: 8 }}>{props.icon}</ListItemIcon>
      <ListItemText ref={ref}>{props.label}</ListItemText>
    </MenuItem>
  )
})

interface MenuProps {
  account: Account
  activated: boolean
  children: (anchorProps: AnchorRenderProps) => React.ReactNode
  onAccountSettings: () => void
  onManageAssets: () => void
  onTrade: () => void
  onWithdraw: () => void
  settings: SettingsContextType
}

function AccountContextMenu(props: MenuProps) {
  return (
    <ContextMenu
      anchor={props.children}
      menu={({ anchorEl, open, onClose, closeAndCall }) => (
        <Menu anchorEl={anchorEl || undefined} open={open} onClose={onClose}>
          <AccountContextMenuItem
            disabled={!props.activated}
            icon={<SettingsIcon />}
            label="Account Settings"
            onClick={closeAndCall(props.onAccountSettings)}
          />
          <AccountContextMenuItem
            disabled={!props.activated}
            icon={<MoneyIcon />}
            label="Assets"
            onClick={closeAndCall(props.onManageAssets)}
          />
          <AccountContextMenuItem
            disabled={!props.activated}
            icon={<SwapHorizIcon style={{ transform: "scale(1.2)" }} />}
            label="Trade Assets"
            onClick={closeAndCall(props.onTrade)}
          />
          <AccountContextMenuItem
            disabled={!props.activated}
            icon={<CallMadeIcon />}
            label="Withdraw"
            onClick={closeAndCall(props.onWithdraw)}
          />
        </Menu>
      )}
    />
  )
}

export default AccountContextMenu
