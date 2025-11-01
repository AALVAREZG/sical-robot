import datetime
import pika
import json
import uuid
import time
from dataclasses import dataclass, asdict
from typing import Dict, Any
from config import *
from enum import Enum
from tenacity import retry, stop_after_attempt, wait_exponential

# Wait for response with timeout
# Seconds to wait for a response from the ejecutor service
# (SICAL) before considering the task as failed
SICAL_RESPONSE_TIMEOUT = 75  # seconds


# 1. Use dataclasses for better data structure
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
    #ADO_220 = "ado_220"
    # Add more task types as needed
    def to_dict(self):
        return self.value

class TaskProducer:
    def __init__(self):
        self.connect()
        self.setup_exchanges()

    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=3, min=4, max=12)
    )
    def connect(self):
        """Establish connection to RabbitMQ with exponential backoff retry mechanism"""
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        
        # Make connection parameters configurable
        connection_params = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=60,  # Reduced from 600 to 60 seconds
            connection_attempts=3,
            retry_delay=2.0,  # Delay between connection attempts in seconds
            socket_timeout=5.0  # Socket timeout in seconds
        )
        
        try:
            self.connection = pika.BlockingConnection(connection_params)
            self.channel = self.connection.channel()
        except pika.exceptions.AMQPConnectionError as e:
            print(f"Failed to connect to RabbitMQ: {e}")
            raise  # Re-raise to trigger retry

    def setup_exchanges(self):
        """Setup exchanges and queues for different task types"""
        # Declare the main topic exchange
        self.channel.exchange_declare(
            exchange="sical_tasks", exchange_type="topic", durable=True
        )

        # Declare queues for each task type
        for task_type in TaskType:
            queue_name = f"sical_queue.{task_type.value}"
            self.channel.queue_declare(queue=queue_name, durable=True)
            self.channel.queue_bind(
                exchange="sical_tasks",
                queue=queue_name,
                routing_key=f"task.{task_type.value}",
            )

        # Declare response queue
        result = self.channel.queue_declare(queue="", exclusive=True)
        self.callback_queue = result.method.queue

        self.channel.basic_consume(
            queue=self.callback_queue,
            on_message_callback=self.on_response,
            auto_ack=True,
        )

    def on_response(self, ch, method, props, body):
        if self.corr_id == props.correlation_id:
            self.response = json.loads(body)

    def send_task(self, task_type: TaskType, task_data: Dict[str, Any]):
        """Send task to appropriate queue based on task type"""
        self.response = None
        self.corr_id = str(uuid.uuid4())

        message = TaskMessage(
            parameters=TaskParameters(priority="normal", retry_count=3),
            task_id=self.corr_id,
            task_type=task_type.value,  # Use the string value instead of Enum
            operation_data=task_data,
            timestamp=datetime.datetime.now().timestamp()
        )

        try:
            self.channel.basic_publish(
                exchange="sical_tasks",
                routing_key=f"task.{task_type.value}",
                properties=pika.BasicProperties(
                    delivery_mode=pika.spec.PERSISTENT_DELIVERY_MODE,
                    correlation_id=message.task_id,
                    reply_to=self.callback_queue,
                    content_type="application/json",
                ),
                body=json.dumps(message.to_dict()),
            )

            # Wait for response with timeout
            timeout = SICAL_RESPONSE_TIMEOUT  # seconds
            start_time = time.time()
            while self.response is None:
                if time.time() - start_time > timeout:
                    print("Response timeout")
                    raise TimeoutError("Response timeout")
                self.connection.process_data_events()

            return self.response

        except (pika.exceptions.AMQPError, TimeoutError) as e:
            print(f"Error sending task: {e}")
            self.connect()  # Reconnect on failure
            raise

    def close(self):
        if self.connection and not self.connection.is_closed:
            self.connection.close()


#### Example usage in a_batch_task_processor.py:
################################################
def send_work_item_payloads(payloads):
    producer = TaskProducer()

    try:
        for payload in payloads:
            task_type = (
                TaskType.ARQUEO if payload["tipo"] == "arqueo" else TaskType.ADO_220
            )

            task_data = {
                "operation": payload,
                "parameters": {"priority": "normal", "retry_count": 3},
            }
            print(f"Sending task...: {task_type} - {task_data} with timeout {SICAL_RESPONSE_TIMEOUT} seconds")
            response = producer.send_task(task_type, task_data)
            print(f"Task sent successfully. Response ...: {response}")

    except Exception as e:
        print(f"Error processing payloads: {e}")
    finally:
        producer.close()
