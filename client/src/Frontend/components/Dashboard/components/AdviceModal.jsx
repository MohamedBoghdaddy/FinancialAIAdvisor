import { Modal, Button } from "react-bootstrap";

const AIAdviceModal = ({ show, onHide, aiAdvice }) => {
  const adviceLines = (aiAdvice || "").split("\n"); // ✅ Prevents 'undefined.split' error

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>AI Financial Advice</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {adviceLines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AIAdviceModal;
