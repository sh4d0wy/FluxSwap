
contract TonResolver() {
    receive() {
        // Forward the remaining value in the
        // incoming message back to the sender
        cashback(sender());
    }
}
