import os
import re

def find_and_update_names(start_dir, whitelist_file):
    # Regex pattern to match component names in TypeScript files
    name_pattern = re.compile(r"this\.name\s*=\s*['\"]([^'\"]*)['\"]")
    # Regex pattern to match node names in the whitelist file, including commented ones
    node_pattern = re.compile(r'(//)?\s*["\']([^"\']+)["\']\s*,?')

    # Step 1: Find component names
    new_names = set()
    for dirpath, dirnames, files in os.walk(start_dir):
        for file_name in files:
            if file_name.endswith('.ts'):
                file_path = os.path.join(dirpath, file_name)
                with open(file_path, 'r') as file:
                    for line in file:
                        match = name_pattern.search(line)
                        if match:
                            new_names.add(match.group(1))

    # Step 2: Read the existing whitelistNodes.ts file
    existing_nodes = []
    with open(whitelist_file, 'r') as file:
        for line in file:
            match = node_pattern.search(line)
            if match:
                # Keep the node name and its commented status
                existing_nodes.append((match.group(2), match.group(1) is not None))
                # Remove the name from the new_names set if it's already listed
                new_names.discard(match.group(2))

    # Step 3: Comment out new names and sort
    all_names = existing_nodes + [(name, True) for name in new_names]
    all_names.sort(key=lambda x: x[0].lower())  # Sort by name, case-insensitive

    # Step 4: Write the updated list back to the whitelistNodes.ts file
    with open(whitelist_file, 'w') as file:
        file.write('const whitelistNodes = [\n')
        for name, is_commented in all_names:
            prefix = '// ' if is_commented else ''
            file.write(f"    {prefix}\'{name}\',\n")
        file.write(']\n\n')
        file.write('export default whitelistNodes\n')
        
    print(f'The following new nodes were added:\n{new_names}')

find_and_update_names('/home/cmclean/programs/ambient-flowise/packages/components/nodes', '/home/cmclean/programs/ambient-flowise/packages/server/src/utils/whitelistNodes.ts')
