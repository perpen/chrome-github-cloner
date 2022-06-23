#!/usr/bin/env python3
'''
Used by the chrome extension for running commands on the host
'''

from __future__ import print_function
import struct
import sys
import threading
import os
import errno
import re
import json
import platform
import traceback
from subprocess import Popen, PIPE


EXTENSION_ID = 'knldjmfmopnpolahpmmgbagdohdnhkik'
LOG_FILE = open(sys.argv[0] + '.out', 'w+')


def log(*args, **kwargs):
    '''Logs to file'''
    print(*args, file=LOG_FILE, **kwargs)
    LOG_FILE.flush()


def run(argv, cwd=None, logger=None):
    '''
    Runs the command, returns exit status.
    Each line of output (stdout/stder are merged) is passed to logger()
    '''
    process = Popen('%s 2>&1' % ' '.join(argv), stdout=PIPE,
                    cwd=cwd, shell=True, preexec_fn=os.setsid)
    while True:
        line = process.stdout.readline()
        if line == b'' and process.poll() is not None:
            break
        logger(line.decode('utf-8'))
    code = process.poll()
    if code != 0:
        raise Exception('command failed with exit status %i: %s' %
                        (code, ' '.join(argv)))
    return code


def mkdir_p(path):
    '''Like unix `mkdir -p`'''
    try:
        os.makedirs(path)
    except OSError as exc:  # Python >2.5
        if exc.errno != errno.EEXIST or not os.path.isdir(path):
            raise


def start_project(git_url, ide_command):
    '''
    Launches command, updates the extension on status
    '''
    try:
        def logger(line):
            log(line)
            send(git_url, 'output', line.strip())

        cmd = ide_command % git_url
        send(git_url, 'status', 'starting %s' % cmd)
        run(['bash', '-c', "'%s'" % cmd], logger=logger)
        send(git_url, 'status', 'complete')

    except Exception as exc:
        log(traceback.format_exc())
        send(git_url, 'output', str(exc))
        send(git_url, 'status', 'error')


def start_project_with_clone(git_url, ide_command, code_location):
    '''
    Clones repo, launches command, updates the extension on status
    '''
    try:
        def logger(line):
            log(line)
            send(git_url, 'output', line.strip())

        match = re.compile(r'^.*/([^ .]+)\.git$').match(git_url)
        if not match:
            raise Exception('unrecognised git url format: %s' % git_url)
        repo_name = match.group(1)

        src_parent = code_location.replace('%s', os.path.expanduser('~'))
        git_dir = os.path.join(src_parent, repo_name)

        if not os.path.exists(git_dir):
            send(git_url, 'status', 'cloning...')
            mkdir_p(src_parent)
            run(["git", "clone", git_url], cwd=src_parent, logger=logger)

        cmd = ide_command % git_dir
        send(git_url, 'status', 'starting %s' % cmd)
        run(['bash', '-c', "'%s'" % cmd], logger=logger)
        send(git_url, 'status', 'complete')

    except Exception as exc:
        send(git_url, 'output', str(exc))
        send(git_url, 'status', 'error')


def send(target, name, value):
    ''' Send a message to the extension '''
    try:
        msg = json.dumps({"target": target, "data": {
                         name: value}}).encode('utf-8')
        sys.stdout.buffer.write(struct.pack("I", len(msg)))
        sys.stdout.buffer.write(msg)
        sys.stdout.buffer.flush()
    except IOError:
        log(traceback.format_exc())


def serve():
    ''' Serves requests from the extension '''
    while True:
        text_length_bytes = sys.stdin.buffer.read(4)
        if len(text_length_bytes) == 0:
            break
        text_length = struct.unpack('i', text_length_bytes)[0]
        text = json.loads(sys.stdin.buffer.read(text_length))

        git_url = text['url']
        ide_command = text['ideCommand']
        # log(f'git_url={git_url} ide_command={ide_command}')
        thread = threading.Thread(target=start_project, args=(
            git_url, ide_command))
        # FIXME thread.daemon = True
        thread.start()


def register_script_with_extension(chrome_dir):
    '''yes that'''
    manifest_template = '''{
    "name": "org.hfdom.chrome_github_cloner",
    "description": "Clone a repo and Start your IDE from github pages",
    "path": "%s",
    "type": "stdio",
    "allowed_origins": [
        "chrome-extension://%s/"
    ]
}
'''

    def generic_install(script_path, manifest_path):
        print('Copying self to %s' % script_path)
        with open(sys.argv[0], 'rb') as this_script:
            content = this_script.read()
            with open(script_path, 'wb') as script_copy:
                script_copy.write(content)
        os.chmod(script_path, 0o700)

        manifest = manifest_template % (script_path, EXTENSION_ID)
        print('Creating manifest %s\nContent:\n%s' % (manifest_path, manifest))
        with open(manifest_path, 'wb') as f:
            f.write(manifest.encode('utf-8'))

        print('You may now delete the extension directory, unless you intend on making changes')

    def unix():
        script_path = '%s/.chrome-github-cloner.py' % os.environ['HOME']
        manifest_path = '%s/NativeMessagingHosts/org.hfdom.chrome_github_cloner.json' % chrome_dir
        generic_install(script_path, manifest_path)

    system = platform.system()
    registrar = {
        'Darwin': unix,
        'Linux': unix,
    }[system]

    if not registrar:
        msg = 'does not know how to register script on platform "%s", submit PR' % system
        print(msg, file=sys.stderr)
        log(msg)
        sys.exit(1)
    registrar()


if len(sys.argv) == 3 and sys.argv[1] == 'install':
    chrome_dir = sys.argv[2]
    test_path = '%s/Default' % chrome_dir
    if not os.path.isdir(test_path):
        print('provided path is probably incorrect, as %s does not exist' % test_path,
              file=sys.stderr)
        sys.exit(2)
    register_script_with_extension(chrome_dir)
    sys.exit(0)

if len(sys.argv) == 1 or not sys.argv[1].startswith('chrome-extension:'):
    print('Usage: %s install USER_CHROME_CONFIG_DIR\n  Example: %s install ~/.config/google-chrome' % (sys.argv[0], sys.argv[0]),
          file=sys.stderr)
    sys.exit(2)

try:
    log('serving')
    serve()
except Exception:
    log(traceback.format_exc())
    sys.exit(1)
