// An error whose message is safe to show the customer at checkout, with the
// HTTP status to use.
class CheckoutError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Amounts in TND are kept to the millime
const roundMillimes = (amount) => Math.round(amount * 1000) / 1000;

module.exports = { CheckoutError, roundMillimes };
