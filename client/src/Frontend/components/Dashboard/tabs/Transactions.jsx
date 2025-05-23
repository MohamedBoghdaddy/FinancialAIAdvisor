import React from "react";
import { Card } from "react-bootstrap";
import TransactionList from "../components/TransactionList";

const TransactionsTab = ({ transactions }) => (
  <>
    <h2 className="tab-title">Transaction History</h2>
    <Card className="dashboard-card">
      <Card.Body>
        <TransactionList transactions={transactions} />
      </Card.Body>
    </Card>
  </>
);

export default TransactionsTab;
