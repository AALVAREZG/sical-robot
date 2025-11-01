"""
Mock RabbitMQ Producer for Testing Without RabbitMQ Server

This module simulates RabbitMQ behavior for testing the partial failure tracking.
No actual RabbitMQ connection required.
"""

import datetime
import json
import uuid
import time
import os
from dataclasses import dataclass, asdict
from typing import Dict, Any
from enum import Enum

# Mock timeout (much shorter than real 75 seconds)
SICAL_RESPONSE_TIMEOUT = 2  # seconds


@dataclass
class TaskParameters:
    priority: str = "normal"
    retry_count: int = 1


@dataclass
class TaskMessage:
    operation_data: Dict[str, Any]
    parameters: TaskParameters
    task_id: str
    task_type: str
    timestamp: float

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaskMessage':
        params = TaskParameters(**data.get('parameters', {}))
        return cls(
            operation_data=data['operation'],
            parameters=params,
            task_id=data['task_id'],
            task_type=data['task_type'],
            timestamp=data['timestamp']
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            'operation_data': self.operation_data,
            'parameters': asdict(self.parameters),
            'task_id': self.task_id,
            'task_type': self.task_type,
            'timestamp': self.timestamp
        }


class TaskType(Enum):
    ARQUEO = "arqueo"
    GASTO = "gasto"

    def to_dict(self):
        return self.value


class TaskProducer:
    """
    Mock TaskProducer that simulates RabbitMQ responses.

    Behavior controlled by MOCK_MODE environment variable:
    - 'all_success': All operations succeed
    - 'all_fail': All operations fail
    - 'partial': Operation #2 (index 1) fails, others succeed
    - 'random': Random success/failure
    """

    def __init__(self):
        self.mock_mode = os.getenv('MOCK_MODE', 'partial')
        self.operation_counter = 0
        print(f"\n{'='*70}")
        print(f"🧪 MOCK MODE ENABLED: {self.mock_mode}")
        print(f"{'='*70}\n")
        self.connect()
        self.setup_exchanges()

    def connect(self):
        """Mock connection - always succeeds"""
        print("🔌 Mock: Simulating RabbitMQ connection... SUCCESS")
        self.connection = MockConnection()
        self.channel = MockChannel()
        time.sleep(0.1)  # Simulate connection delay

    def setup_exchanges(self):
        """Mock exchange setup - always succeeds"""
        print("📋 Mock: Setting up exchanges and queues... SUCCESS")
        self.callback_queue = f"mock_callback_queue_{uuid.uuid4()}"
        time.sleep(0.05)  # Simulate setup delay

    def on_response(self, ch, method, props, body):
        """Mock response handler"""
        pass

    def send_task(self, task_type: TaskType, task_data: Dict[str, Any]):
        """
        Send task to mock RabbitMQ and return simulated response.

        Simulates different scenarios based on MOCK_MODE.
        """
        self.response = None
        self.corr_id = str(uuid.uuid4())

        message = TaskMessage(
            parameters=TaskParameters(priority="normal", retry_count=3),
            task_id=self.corr_id,
            task_type=task_type.value,
            operation_data=task_data,
            timestamp=datetime.datetime.now().timestamp()
        )

        # Extract operation index from op_id (e.g., "file.json_001" -> 1)
        op_id = task_data.get('operation', {}).get('op_id', '')
        try:
            op_index = int(op_id.split('_')[-1]) if '_' in op_id else self.operation_counter
        except:
            op_index = self.operation_counter

        self.operation_counter += 1

        # Simulate processing delay
        print(f"📤 Mock: Publishing to queue '{task_type.value}'...")
        time.sleep(0.3)  # Simulate network + processing delay

        # Determine success/failure based on mock mode
        should_succeed = self._should_succeed(op_index, task_type)

        if should_succeed:
            # Simulate successful response
            response = {
                'status': 'COMPLETED',
                'sical_id': f'MOCK-SICAL-{self.corr_id[:8]}',
                'task_id': self.corr_id,
                'processed_at': datetime.datetime.now().isoformat(),
                'message': f'Mock: {task_type.value} operation completed successfully'
            }
            print(f"✅ Mock: Received SUCCESS response from SICAL")
            return response
        else:
            # Simulate failure
            error_msg = self._get_error_message(op_index, task_type)
            print(f"❌ Mock: Simulating FAILURE - {error_msg}")
            raise TimeoutError(error_msg)

    def _should_succeed(self, op_index: int, task_type: TaskType) -> bool:
        """Determine if operation should succeed based on mock mode"""
        mode = self.mock_mode.lower()

        if mode == 'all_success':
            return True
        elif mode == 'all_fail':
            return False
        elif mode == 'partial':
            # Fail operation at index 1 (second operation)
            return op_index != 1
        elif mode == 'random':
            import random
            return random.choice([True, False])
        else:
            # Default: partial mode
            return op_index != 1

    def _get_error_message(self, op_index: int, task_type: TaskType) -> str:
        """Get appropriate error message based on mock mode"""
        errors = [
            "Response timeout after 75 seconds",
            "Connection lost during processing",
            "SICAL service unavailable",
            "Validation error: Invalid tercero code",
            "Database constraint violation",
        ]

        # Use op_index to get consistent error for same operation
        return errors[op_index % len(errors)]

    def close(self):
        """Mock close - always succeeds"""
        print("🔌 Mock: Closing connection... SUCCESS\n")
        time.sleep(0.05)


class MockConnection:
    """Mock RabbitMQ connection"""
    def __init__(self):
        self.is_closed = False

    def close(self):
        self.is_closed = True

    def process_data_events(self):
        time.sleep(0.01)


class MockChannel:
    """Mock RabbitMQ channel"""
    def exchange_declare(self, **kwargs):
        pass

    def queue_declare(self, **kwargs):
        class Result:
            method = type('Method', (), {'queue': 'mock_queue'})()
        return Result()

    def queue_bind(self, **kwargs):
        pass

    def basic_consume(self, **kwargs):
        pass

    def basic_publish(self, **kwargs):
        pass
