import os
import shutil
import re
import yaml

SOURCE_DIR = "/Users/villain/plugins"
TARGET_DIR = "/Users/villain/agent-skill-registry/shared"
REGISTRY_PATH = "/Users/villain/agent-skill-registry/registry.yaml"

# Ensure target shared directory exists
os.makedirs(TARGET_DIR, exist_ok=True)

# List of plugins and their mapping
mappings = [
    # 1. frontend-design
    {
        "source": "frontend-design copy",
        "skills": [
            {
                "src_path": "skills/frontend-design",
                "dest_path": "functional/frontend-design",
                "name": "frontend-design",
                "tier": "functional",
                "trust_tier": "T2",
                "description": "Create distinctive, polished, production-grade frontend interfaces that avoid generic AI aesthetics."
            }
        ],
        "commands": [],
        "agents": []
    },
    # 2. code-review
    {
        "source": "code-review copy",
        "skills": [],
        "commands": [
            {
                "src_file": "commands/code-review.md",
                "dest_path": "functional/command-code-review",
                "name": "command:code-review",
                "tier": "functional",
                "trust_tier": "T3",
                "description": "Provides a comprehensive, multi-agent code review for a GitHub Pull Request."
            }
        ],
        "agents": []
    },
    # 3. feature-dev
    {
        "source": "feature-dev copy",
        "skills": [],
        "commands": [
            {
                "src_file": "commands/feature-dev.md",
                "dest_path": "planning/command-feature-dev",
                "name": "command:feature-dev",
                "tier": "planning",
                "trust_tier": "T2",
                "description": "Guides the step-by-step implementation of new features using automated explorer, review, and architect loops."
            }
        ],
        "agents": [
            {
                "src_file": "agents/code-reviewer.md",
                "dest_path": "documentation/agent-code-reviewer",
                "name": "agent:code-reviewer",
                "tier": "documentation",
                "trust_tier": "T1",
                "description": "Code Reviewer agent instructions focusing on style guides, bugs, and compliance."
            },
            {
                "src_file": "agents/code-explorer.md",
                "dest_path": "documentation/agent-code-explorer",
                "name": "agent:code-explorer",
                "tier": "documentation",
                "trust_tier": "T1",
                "description": "Code Explorer agent instructions for scanning codebase structure and mapping files."
            },
            {
                "src_file": "agents/code-architect.md",
                "dest_path": "documentation/agent-code-architect",
                "name": "agent:code-architect",
                "tier": "documentation",
                "trust_tier": "T1",
                "description": "Code Architect agent instructions for designing system modules and class designs."
            }
        ]
    },
    # 4. plugin-dev
    {
        "source": "plugin-dev copy",
        "skills": [
            {
                "src_path": "skills/command-development",
                "dest_path": "acquisition/skill-command-dev",
                "name": "skill:command-dev",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Instructions for building Claude CLI commands."
            },
            {
                "src_path": "skills/skill-development",
                "dest_path": "acquisition/skill-skill-dev",
                "name": "skill:skill-dev",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Guidelines for authoring and structured compilation of portable AI skills."
            },
            {
                "src_path": "skills/plugin-settings",
                "dest_path": "acquisition/skill-plugin-settings",
                "name": "skill:plugin-settings",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Configuring, reading, and validating plugin-specific JSON settings."
            },
            {
                "src_path": "skills/plugin-structure",
                "dest_path": "acquisition/skill-plugin-structure",
                "name": "skill:plugin-structure",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Managing the standard layout and manifest files of CLI plugins."
            },
            {
                "src_path": "skills/hook-development",
                "dest_path": "acquisition/skill-hook-dev",
                "name": "skill:hook-dev",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Implementing pre-write, pre-command, and session validation hooks."
            },
            {
                "src_path": "skills/mcp-integration",
                "dest_path": "acquisition/skill-mcp-integration",
                "name": "skill:mcp-integration",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Connecting, authenticating, and communicating with Model Context Protocol servers."
            },
            {
                "src_path": "skills/agent-development",
                "dest_path": "acquisition/skill-agent-dev",
                "name": "skill:agent-dev",
                "tier": "acquisition",
                "trust_tier": "T2",
                "description": "Creating customized prompts and persona triggers for sub-agents."
            }
        ],
        "commands": [
            {
                "src_file": "commands/create-plugin.md",
                "dest_path": "functional/command-create-plugin",
                "name": "command:create-plugin",
                "tier": "functional",
                "trust_tier": "T3",
                "description": "Workflow command to scaffold, validate, and test new plugins."
            }
        ],
        "agents": [
            {
                "src_file": "agents/agent-creator.md",
                "dest_path": "documentation/agent-agent-creator",
                "name": "agent:agent-creator",
                "tier": "documentation",
                "trust_tier": "T1",
                "description": "Prompt for generating specialized sub-agent definitions."
            },
            {
                "src_file": "agents/skill-reviewer.md",
                "dest_path": "documentation/agent-skill-reviewer",
                "name": "agent:skill-reviewer",
                "tier": "documentation",
                "trust_tier": "T1",
                "description": "Prompt for evaluating instruction readability and compliance."
            },
            {
                "src_file": "agents/plugin-validator.md",
                "dest_path": "documentation/agent-plugin-validator",
                "name": "agent:plugin-validator",
                "tier": "documentation",
                "trust_tier": "T1",
                "description": "Prompt for static validation of manifest structure and tool scope."
            }
        ]
    }
]

def update_frontmatter(file_path, name, tier, trust_tier):
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Match existing frontmatter
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if match:
        fm_content = match.group(1)
        body = content[match.end():]
    else:
        fm_content = ""
        body = content

    # Parse and update frontmatter keys
    fm_lines = fm_content.split("\n")
    fm_dict = {}
    for line in fm_lines:
        trimmed = line.strip()
        if not trimmed or ":" not in trimmed:
            continue
        parts = trimmed.split(":", 1)
        fm_dict[parts[0].strip()] = parts[1].strip()

    # Update metadata
    fm_dict["name"] = name
    fm_dict["tier"] = tier
    fm_dict["trust_tier"] = trust_tier
    fm_dict["status"] = "active"

    # Format new frontmatter
    new_fm = "---\n"
    for k, v in fm_dict.items():
        new_fm += f"{k}: {v}\n"
    new_fm += "---\n\n"

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_fm + body)
    print(f"Updated frontmatter for: {file_path}")

new_skills_to_register = []

# Process migrations
for plugin in mappings:
    plugin_src_dir = os.path.join(SOURCE_DIR, plugin["source"])
    if not os.path.exists(plugin_src_dir):
        print(f"Warning: Source plugin dir not found: {plugin_src_dir}")
        continue
        
    print(f"\nProcessing plugin: {plugin['source']}")

    # 1. Process Skills (folders)
    for skill in plugin["skills"]:
        s_src = os.path.join(plugin_src_dir, skill["src_path"])
        s_dest = os.path.join(TARGET_DIR, skill["dest_path"])
        if os.path.exists(s_src):
            if os.path.exists(s_dest):
                shutil.rmtree(s_dest)
            shutil.copytree(s_src, s_dest)
            print(f"Copied directory: {s_src} -> {s_dest}")
            
            # Update SKILL.md inside destination
            skill_md = os.path.join(s_dest, "SKILL.md")
            update_frontmatter(skill_md, skill["name"], skill["tier"], skill["trust_tier"])
            
            # Track to add to registry.yaml
            new_skills_to_register.append({
                "name": skill["name"],
                "tier": skill["tier"],
                "path": f"shared/{skill['dest_path']}",
                "description": skill["description"],
                "trust_tier": skill["trust_tier"],
                "status": "active"
            })

    # 2. Process Commands (single md files)
    for cmd in plugin["commands"]:
        f_src = os.path.join(plugin_src_dir, cmd["src_file"])
        s_dest = os.path.join(TARGET_DIR, cmd["dest_path"])
        if os.path.exists(f_src):
            os.makedirs(s_dest, exist_ok=True)
            skill_md = os.path.join(s_dest, "SKILL.md")
            shutil.copy2(f_src, skill_md)
            print(f"Copied command file: {f_src} -> {skill_md}")
            
            update_frontmatter(skill_md, cmd["name"], cmd["tier"], cmd["trust_tier"])
            
            new_skills_to_register.append({
                "name": cmd["name"],
                "tier": cmd["tier"],
                "path": f"shared/{cmd['dest_path']}",
                "description": cmd["description"],
                "trust_tier": cmd["trust_tier"],
                "status": "active"
            })

    # 3. Process Agents (single md files)
    for agent in plugin["agents"]:
        f_src = os.path.join(plugin_src_dir, agent["src_file"])
        s_dest = os.path.join(TARGET_DIR, agent["dest_path"])
        if os.path.exists(f_src):
            os.makedirs(s_dest, exist_ok=True)
            skill_md = os.path.join(s_dest, "SKILL.md")
            shutil.copy2(f_src, skill_md)
            print(f"Copied agent file: {f_src} -> {skill_md}")
            
            update_frontmatter(skill_md, agent["name"], agent["tier"], agent["trust_tier"])
            
            new_skills_to_register.append({
                "name": agent["name"],
                "tier": agent["tier"],
                "path": f"shared/{agent['dest_path']}",
                "description": agent["description"],
                "trust_tier": agent["trust_tier"],
                "status": "active"
            })

# Load and update registry.yaml
if os.path.exists(REGISTRY_PATH):
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = yaml.safe_load(f) or {}
    
    existing_skills = registry.get("skills", [])
    existing_names = {s["name"] for s in existing_skills}

    added_count = 0
    for new_skill in new_skills_to_register:
        if new_skill["name"] not in existing_names:
            existing_skills.append(new_skill)
            added_count += 1
            existing_names.add(new_skill["name"])

    registry["skills"] = existing_skills

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        yaml.dump(registry, f, sort_keys=False, default_flow_style=False)
    
    print(f"\nSuccessfully added {added_count} new skills to registry.yaml")
