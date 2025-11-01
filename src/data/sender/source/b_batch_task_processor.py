
import os, json, sys, shutil
from pathlib import Path
from datetime import datetime

# Check if we should use mock mode (for testing without RabbitMQ)
USE_MOCK = os.getenv('USE_MOCK', 'false').lower() in ('true', '1', 'yes')

if USE_MOCK:
    print("\n" + "="*70)
    print("🧪 MOCK MODE ENABLED - Testing without RabbitMQ")
    print("="*70 + "\n")
    from rabbit_mq_producer_mock import TaskProducer, TaskType
else:
    from rabbit_mq_producer import TaskProducer, TaskType

#ROBOT_DIR = Path(os.getenv("ROBOT_ROOT"))
# 1. Using pathlib (Modern, recommended way)

# Constants for application paths
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    BASE_PATH = Path(sys.executable).parent
    RESOURCE_PATH = Path(sys._MEIPASS)
else:
    # Running as script
    BASE_PATH = Path(__file__).parent.absolute()
    RESOURCE_PATH = Path().absolute()

# Derived constants

ROBOT_DIR = BASE_PATH

INPUT_FOLDER_NAME = 'input'
PENDING_BATCHES_FOLDER_NAME = 'pending_files'
PENDING_BATCHES_PATH = os.path.join(ROBOT_DIR, INPUT_FOLDER_NAME, PENDING_BATCHES_FOLDER_NAME)

PROCESSED_BATCHES_FOLDER_NAME = 'processed_files'
PROCESSED_BATCHES_PATH = os.path.join(ROBOT_DIR, INPUT_FOLDER_NAME, PROCESSED_BATCHES_FOLDER_NAME)
ARCHIVED_BATCHES_PATH = os.path.join(PROCESSED_BATCHES_PATH, 'archived')

FAILED_FOLDER_NAME = 'failed'
FAILED_FOLDER_PATH = os.path.join(ROBOT_DIR, INPUT_FOLDER_NAME, FAILED_FOLDER_NAME)

# NEW: Partial folder for tasks with mixed success/failure
PARTIAL_FOLDER_NAME = 'partial'
PARTIAL_FOLDER_PATH = os.path.join(ROBOT_DIR, INPUT_FOLDER_NAME, PARTIAL_FOLDER_NAME)

LOG_DICT = {}


def ensure_directories():
    """Ensure all required directories exist"""
    os.makedirs(PENDING_BATCHES_PATH, exist_ok=True)
    os.makedirs(PROCESSED_BATCHES_PATH, exist_ok=True)
    os.makedirs(FAILED_FOLDER_PATH, exist_ok=True)
    os.makedirs(PARTIAL_FOLDER_PATH, exist_ok=True)
    os.makedirs(ARCHIVED_BATCHES_PATH, exist_ok=True)
    print(f"Directories ensured: pending, processed, failed, partial, archived")


def produce_data():
    """Main function to process pending task files"""
    # Ensure all directories exist
    ensure_directories()

    pending_batches_list = [file for file in os.listdir(PENDING_BATCHES_PATH) if file.endswith('.json')]

    if len(pending_batches_list) > 0:
        print(f"\n{'='*70}")
        print(f"Found {len(pending_batches_list)} files to process")
        print(f"{'='*70}\n")

        for file in pending_batches_list:
            now = datetime.now()
            formatted_now = now.strftime("%Y-%m-%d %H:%M:%S")

            print(f"\n{'='*70}")
            print(f"Processing file: {file}")
            print(f"Timestamp: {formatted_now}")
            print(f"{'='*70}\n")

            LOG_DICT = {}
            LOG_DICT['file'] = file
            LOG_DICT['timestamp'] = formatted_now

            # Load JSON file
            filepath = os.path.join(PENDING_BATCHES_PATH, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as jsonfile:
                    data = json.load(jsonfile)
            except Exception as e:
                print(f"❌ ERROR: Failed to load JSON file: {e}")
                move_batch_to_failed(file)
                continue

            # Extract metadata
            num_operaciones = data.get('num_operaciones', 0)
            liquido_operaciones = data.get('liquido_operaciones', 0)
            bank_movement = data.get('bank_movement', None)

            print(f"Operations to process: {num_operaciones}")
            print(f"Total amount: {liquido_operaciones}")

            if bank_movement:
                print(f"Bank account: {bank_movement.get('caja', 'N/A')}")
                print(f"Bank concept: {bank_movement.get('concepto', 'N/A')[:50]}...")

            # Create payloads
            payloads = create_work_item_payloads(data['operaciones'], file, bank_movement)

            # Send to RabbitMQ and track all responses
            response = send_work_item_payloads(payloads)

            # Save detailed results
            save_results_file(file, response)

            # Move file based on overall status
            if response['overall_status'] == 'COMPLETED':
                move_batch_to_processed(file)
                print(f"\n✅ SUCCESS: All {num_operaciones} operations completed")
                print(f"   File moved to: processed_files/")

            elif response['overall_status'] == 'FAILED':
                move_batch_to_failed(file)
                print(f"\n❌ FAILED: All {num_operaciones} operations failed")
                print(f"   File moved to: failed/")

            elif response['overall_status'] == 'PARTIAL':
                move_batch_to_partial(file)
                print(f"\n⚠️  PARTIAL: {response['succeeded']}/{num_operaciones} operations completed")
                print(f"   Succeeded: {response['succeeded']} operations")
                print(f"   Failed: {response['failed']} operations")
                print(f"   File moved to: partial/")

                # Show which operations failed
                failed_ops = [r for r in response['results'] if r['status'] != 'COMPLETED']
                if failed_ops:
                    print(f"\n   Failed operations:")
                    for op in failed_ops:
                        print(f"     - {op['op_id']}: {op.get('error', 'Unknown error')}")

            print(f"\n{'='*70}\n")
    else:
        print("No files to process..")


def save_results_file(batch, response):
    """Save detailed results alongside the task file"""
    # Determine destination folder based on overall status
    if response['overall_status'] == 'COMPLETED':
        dest_folder = PROCESSED_BATCHES_PATH
    elif response['overall_status'] == 'FAILED':
        dest_folder = FAILED_FOLDER_PATH
    elif response['overall_status'] == 'PARTIAL':
        dest_folder = PARTIAL_FOLDER_PATH
    else:
        dest_folder = FAILED_FOLDER_PATH

    # Create results filename (same as task, but with _results suffix)
    results_filename = batch.replace('.json', '_results.json')
    results_filepath = os.path.join(dest_folder, results_filename)

    # Prepare results data
    results_data = {
        'task_file': batch,
        'processed_at': datetime.now().isoformat(),
        'overall_status': response['overall_status'],
        'total_operations': response['total'],
        'succeeded_count': response['succeeded'],
        'failed_count': response['failed'],
        'operation_results': response['results']
    }

    # Save results to JSON file
    try:
        with open(results_filepath, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)
        print(f"Results saved to: {results_filename}")
    except Exception as e:
        print(f"⚠️  Warning: Could not save results file: {e}")


def move_batch_to_processed(batch):
    """Move batch to processed folder when all operations succeeded"""
    pending_batch_with_path = os.path.join(PENDING_BATCHES_PATH, batch)
    processed_batch_with_path = os.path.join(PROCESSED_BATCHES_PATH, batch)
    shutil.move(pending_batch_with_path, processed_batch_with_path)


def move_batch_to_failed(batch):
    """Move batch to failed folder when all operations failed"""
    pending_batch_with_path = os.path.join(PENDING_BATCHES_PATH, batch)
    failed_batch_with_path = os.path.join(FAILED_FOLDER_PATH, batch)
    shutil.move(pending_batch_with_path, failed_batch_with_path)


def move_batch_to_partial(batch):
    """Move batch to partial folder when some operations failed"""
    pending_batch_with_path = os.path.join(PENDING_BATCHES_PATH, batch)
    partial_batch_with_path = os.path.join(PARTIAL_FOLDER_PATH, batch)
    shutil.move(pending_batch_with_path, partial_batch_with_path)


def send_work_item_payloads(payloads):
    """
    Send all payloads to RabbitMQ and track individual responses.

    CRITICAL FIX: Tracks ALL responses, not just the last one.
    Returns detailed status for each operation.
    """
    producer = TaskProducer()
    results = []  # Track ALL responses

    try:
        for index, payload in enumerate(payloads):
            task_type = TaskType.ARQUEO if payload['tipo'] == 'arqueo' else TaskType.GASTO

            task_data = {
                "operation": payload,
                "parameters": {
                    "priority": "normal",
                    "retry_count": 3
                }
            }

            try:
                print(f"\n[{index + 1}/{len(payloads)}] Sending operation: {payload['op_id']}")
                print(f"  Type: {payload['tipo']}")
                print(f"  Caja: {payload.get('caja', 'N/A')}")

                # Send task and wait for response
                response = producer.send_task(task_type, task_data)

                print(f"  ✅ Response: {response.get('status', 'UNKNOWN')}")

                # Record success
                results.append({
                    'index': index,
                    'op_id': payload['op_id'],
                    'tipo': payload['tipo'],
                    'status': response.get('status', 'UNKNOWN'),
                    'response': response,
                    'error': None
                })

            except Exception as op_error:
                # Record failure for this specific operation
                error_msg = str(op_error)
                print(f"  ❌ ERROR: {error_msg}")

                results.append({
                    'index': index,
                    'op_id': payload['op_id'],
                    'tipo': payload['tipo'],
                    'status': 'FAILED',
                    'response': None,
                    'error': error_msg
                })

        # Analyze overall status
        succeeded = [r for r in results if r['status'] == 'COMPLETED']
        failed = [r for r in results if r['status'] != 'COMPLETED']

        if len(failed) == 0:
            overall_status = 'COMPLETED'
        elif len(succeeded) == 0:
            overall_status = 'FAILED'
        else:
            overall_status = 'PARTIAL'

        return {
            'overall_status': overall_status,
            'total': len(results),
            'succeeded': len(succeeded),
            'failed': len(failed),
            'results': results
        }

    except Exception as e:
        # Critical error (connection failure, etc.)
        print(f"❌ CRITICAL ERROR: {e}")

        return {
            'overall_status': 'FAILED',
            'total': len(payloads),
            'succeeded': 0,
            'failed': len(payloads),
            'error': str(e),
            'results': []
        }

    finally:
        producer.close()


def create_work_item_payloads(operaciones, source, bank_movement=None):
    """
    Create payloads for each operation.

    NEW: Accepts optional bank_movement parameter to include bank context.
    """
    payloads = []
    for index, operacion in enumerate(operaciones):
        payload = dict(
            op_id = source + '_' + str(index).zfill(3),
            tipo = operacion['tipo'],

            ## Common fields
            caja = operacion['detalle']['caja'],
            tercero = operacion['detalle']['tercero'],

            ## Arqueo fields
            fecha_ingreso = operacion['detalle'].get('fecha', None),
            naturaleza = operacion['detalle'].get('naturaleza', None),
            final = operacion['detalle'].get('final', None),
            texto_sical = operacion['detalle'].get('texto_sical', None),

            ## ADO_220 or PMP_450 fields
            fecha = operacion['detalle'].get('fecha', None),
            fpago = operacion['detalle'].get('fpago', None),
            tpago = operacion['detalle'].get('tpago', None),
            texto = operacion['detalle'].get('texto', None),
            aplicaciones = operacion['detalle'].get('aplicaciones', None)
        )

        # NEW: Add bank movement context if available
        if bank_movement:
            payload['bank_movement_id'] = bank_movement.get('id')
            payload['bank_caja'] = bank_movement.get('caja')
            payload['bank_fecha'] = bank_movement.get('fecha')
            payload['bank_concepto'] = bank_movement.get('concepto')
            payload['bank_importe'] = bank_movement.get('importe')
            payload['bank_saldo'] = bank_movement.get('saldo')

        payloads.append(payload)

    return payloads


if __name__ == "__main__":
    produce_data()
