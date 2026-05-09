from jinja2 import Environment, FileSystemLoader
import os
import logging

logger = logging.getLogger(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")


def render_deploy_yaml(
    image: str,
    gpus: str,
    model_path: str,
    port: int,
    tp_size: int,
    consul_host: str,
    consul_token: str,
    service_name: str = "hn-chat",
    key_path: str = "",
) -> str:
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template("deploy_chat.yaml.j2")
    gpu_list = [g.strip() for g in gpus.split(",")]
    yaml_content = template.render(
        image=image,
        gpus=gpus,
        model_path=model_path,
        port=port,
        tp_size=tp_size,
        consul_host=consul_host,
        consul_token=consul_token,
        service_name=service_name,
        key_path=key_path,
        gpu_list=gpu_list,
    )
    logger.info(f"YAML 模板渲染成功")
    return yaml_content
