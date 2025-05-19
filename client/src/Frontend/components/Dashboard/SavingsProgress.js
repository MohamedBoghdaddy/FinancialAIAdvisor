import React from "react";
import { ProgressBar } from "react-bootstrap";
import PropTypes from "prop-types";

const SavingsProgress = ({ current, goal, progress }) => {
  return (
    <div className="savings-progress">
      <h6 className="progress-title">Savings Goal Progress</h6>
      <ProgressBar
        now={progress}
        label={`${progress.toFixed(0)}%`}
        className="mb-3"
        variant="success"
      />
      <div className="progress-labels d-flex justify-content-between">
        <span className="current-savings">
          Saved: ${current.toLocaleString()}
        </span>
        <span className="goal">Goal: ${goal.toLocaleString()}</span>
      </div>
    </div>
  );
};

SavingsProgress.propTypes = {
  current: PropTypes.number.isRequired,
  goal: PropTypes.number.isRequired,
  progress: PropTypes.number.isRequired,
};

export default SavingsProgress;
