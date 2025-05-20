import React from "react";
import { Modal, Button } from "react-bootstrap";

const AIAdviceModal = ({ show, onHide, aiAdvice }) => (
  <Modal show={show} onHide={onHide} size="lg">
    <Modal.Header closeButton>
      <Modal.Title>AI Financial Advice</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div className="ai-advice-content">
        {aiAdvice.split("\n").map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
);

export default AIAdviceModal;
