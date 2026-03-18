# backend/app/core/telemetry.py
"""
OpenTelemetry setup for MiniQuest.
Sends traces to the Prove AI observability pipeline.
"""

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
import logging

logger = logging.getLogger(__name__)

_tracer: trace.Tracer = None

def setup_telemetry(
    endpoint: str = "http://host.docker.internal:4318/v1/traces",
    api_key: str = "shreyas-test-key",
    service_name: str = "miniquest"
):
    """
    Initialize OTel tracing and connect to the observability pipeline.
    Call this once at FastAPI startup.
    
    Set OBSERVABILITY_ENABLED=false in production to disable cleanly
    without noisy connection errors.
    """
    global _tracer
    import os

    if os.getenv("OBSERVABILITY_ENABLED", "true").lower() == "false":
        logger.info("⏭️ OTel telemetry disabled (OBSERVABILITY_ENABLED=false)")
        _tracer = trace.get_tracer(service_name)  # no-op tracer
        return _tracer

    exporter = OTLPSpanExporter(
        endpoint=endpoint,
        headers={"X-API-Key": api_key}
    )

    resource = Resource(attributes={"service.name": service_name})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    _tracer = trace.get_tracer(service_name)

    logger.info(f"✅ OTel telemetry initialized → {endpoint}")
    return _tracer


def get_tracer() -> trace.Tracer:
    """Get the initialized tracer. Call setup_telemetry() first."""
    global _tracer
    if _tracer is None:
        # Fallback: no-op tracer so the app still works without pipeline running
        _tracer = trace.get_tracer("miniquest")
    return _tracer