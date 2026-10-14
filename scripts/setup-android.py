"""Install verified Android SDK tooling and JDK inside /workspace; never change HOME."""
import os, pathlib, urllib.request, hashlib, zipfile, tarfile, subprocess, urllib.parse
root=pathlib.Path('/workspace'); sdk=root/'android-sdk'; prefs=root/'android-user'; prefs.mkdir(exist_ok=True)
cli=sdk/'cmdline-tools/19.0/cmdline-tools/bin/sdkmanager'
if not cli.exists():
    url='https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip'
    target=root/'android-tools19.zip'; urllib.request.urlretrieve(url,target)
    assert hashlib.sha1(target.read_bytes()).hexdigest()=='5fdcc763663eefb86a5b8879697aa6088b041e70','Android tool checksum mismatch'
    dest=sdk/'cmdline-tools/19.0';dest.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(target) as z:z.extractall(dest)
    for p in cli.parent.iterdir():p.chmod(0o755)
    target.unlink()
jdk=root/'jdk21/jdk-21.0.8+9'
if not (jdk/'bin/javac').exists():
    url='https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.8%2B9/OpenJDK21U-jdk_x64_linux_hotspot_21.0.8_9.tar.gz'
    expected=urllib.request.urlopen(url+'.sha256.txt').read().decode().split()[0]
    target=root/'jdk21.tar.gz';urllib.request.urlretrieve(url,target)
    assert hashlib.sha256(target.read_bytes()).hexdigest()==expected,'JDK checksum mismatch'
    jdk.parent.mkdir(parents=True,exist_ok=True)
    with tarfile.open(target) as t:t.extractall(jdk.parent,filter='data')
    target.unlink()
env=dict(os.environ,ANDROID_USER_HOME=str(prefs),JAVA_TOOL_OPTIONS='-Duser.home='+str(prefs)+' -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts')
subprocess.run([str(cli),'--sdk_root='+str(sdk),'--licenses'],input='y\n'*100,text=True,env=env,check=True)
subprocess.run([str(cli),'--sdk_root='+str(sdk),'platforms;android-35','build-tools;34.0.0','build-tools;35.0.0','platform-tools'],env=env,check=True)
proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
if proxy:
    u=urllib.parse.urlsplit(proxy); gradle=root/'.gradle';gradle.mkdir(exist_ok=True);path=gradle/'gradle.properties'
    existing=path.read_text() if path.exists() else ''
    additions=''
    for scheme in ['http','https']:
        if 'systemProp.'+scheme+'.proxyHost=' not in existing:additions+=f'systemProp.{scheme}.proxyHost={u.hostname}\nsystemProp.{scheme}.proxyPort={u.port or 80}\n'
    if additions:path.write_text(existing+'\n'+additions)
print('Android SDK35, Build Tools34/35 and verified JDK21 are installed. Existing proxy host/port reused without exposing credentials.')
