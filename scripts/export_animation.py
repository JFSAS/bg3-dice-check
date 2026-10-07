import xml.etree.ElementTree as E,json,re
from pathlib import Path
project=Path(__file__).resolve().parents[1]
root=E.parse(project/'source-reference/DiceAnimation.xaml').getroot();key='{http://schemas.microsoft.com/winfx/2006/xaml}Key';name='{http://schemas.microsoft.com/winfx/2006/xaml}Name'
def tag(e):return e.tag.split('}')[-1]
def scalar(s):
 try:return float(s)
 except:return s
def tm(s):
 if s.startswith('{StaticResource '):
  k=s[16:-1];return tm(next(e.text.strip() for e in root if e.get(key)==k))
 p=s.split(':');return sum(float(v)*60**i for i,v in enumerate(reversed(p)))
def tracks(e):
 out=[]
 for a in list(e):
  if 'Animation' not in tag(a):continue
  fs=[]
  for f in a:
   if 'KeyFrame' not in tag(f):continue
   ease=next(iter(f),None)
   fs.append({'t':tm(f.get('KeyTime','0')),'v':scalar(f.get('Value','')),'kind':tag(f),'spline':f.get('KeySpline'),'ease':E.tostring(ease,encoding='unicode') if ease is not None else None})
  out.append({'target':a.get('Storyboard.TargetName'),'property':a.get('Storyboard.TargetProperty'),'begin':tm(a.get('BeginTime','0')),'duration':tm(a.get('Duration','0')),'from':scalar(a.get('From','')),'to':scalar(a.get('To','')),'frames':fs})
 return out
styles={}
for e in root:
 if tag(e)=='Style' and e.get(key):styles[e.get(key)]={a.get('Property'):a.get('Value') for a in e if tag(a)=='Setter' and a.get('Value')}
def node(e):
 t=tag(e)
 if '.' in t or t.startswith('Interaction') or t not in ['Canvas','Grid','Border','Viewbox','TextBlock','Path','AnimatedImage','ContentControl']:return None
 attrs={k.split('}')[-1]:scalar(v) for k,v in e.attrib.items()};sty=re.match(r'{StaticResource (.*)}',str(attrs.get('Style','')))
 if sty:attrs={**styles.get(sty[1],{}),**attrs}
 transforms=[]
 for ch in e:
  if tag(ch).endswith('.RenderTransform'):
   for tr in ch.iter():
    if tag(tr) in ['TranslateTransform','RotateTransform','ScaleTransform','SkewTransform']:transforms.append({'kind':tag(tr),'values':{k:scalar(v) for k,v in tr.attrib.items()}})
 children=[n for ch in e if (n:=node(ch))]
 return {'kind':t,'name':e.get(name),'a':attrs,'transforms':transforms,'children':children}
data={}
for label,k in [('success','SuccessResultTemplate'),('failure','FailedResultTemplate')]:
 e=next(e for e in root if e.get(key)==k);boards={}
 for b in e.iter():
  if tag(b)=='Storyboard' and b.get(key):boards[b.get(key)]={'duration':tm(b.get('Duration','0')),'begin':tm(b.get('BeginTime','0')),'tracks':tracks(b)}
 scene=next(node(c) for c in e if tag(c)=='Canvas')
 data[label]={'scene':scene,'boards':boards}
idle=next(e for e in root if e.get(key)=='WaitingDieJump')
data['idle']={'tracks':tracks(idle)}
bonus=next(e for e in root if e.get(key)=='TargettedEffect')
board=next(e for e in bonus.iter() if tag(e)=='Storyboard')
data['bonus']={'tracks':tracks(board)}
(project/'assets/native-animation.json').write_text(json.dumps(data,indent=2))
print('Imported original idle, bonus, success and failure keyframes')
