# Printer setup

## Two slip types

| Type | Used for | Contents |
|------|----------|----------|
| **Kitchen / bar slip** | Save table order, add items | TABLE number, order id, time, item list (+ modifiers) |
| **Full receipt** | Payment only | Original receipt: logo, address, all lines, totals, cash/change, QR |

Nothing prints when you tap products on POS. Printing happens on **table save** or **payment**.

## Three ON/OFF options

| Option | When |
|--------|------|
| **Save table order** | First order on an empty table (all items on that save) |
| **Add items to table** | Saving more items to an open table (**new lines only**) |
| **Payment** | Checkout — full receipt |

## Example

- **Kitchen** — Food categories, Save order ON, Add items ON, Payment OFF  
- **Bar** — Drinks only, Save order ON, Add items ON, Payment OFF  
- **Cashier** — All categories, Payment ON, kitchen options OFF  

See [DEVICE_ACTIVATION_OTP.md](./DEVICE_ACTIVATION_OTP.md) for device licensing.
