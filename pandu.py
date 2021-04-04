import sys
import time
import requests
from bs4 import BeautifulSoup 
import pandas as pd 

statestart= 2
citystart = 0
states = ["alabama", "aux-nevada", "california", "colorado", "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new-hampshire", "new-jersey", "new-mexico", "new-york", "north-carolina", "north-dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode-island", "south-carolina", "south-dakota", "tennessee", "texas", "utah", "vermont", "virginia", "washington", "washington-dc"]

for p in range(0,len(states)):
  for j in range(statestart,100):
    url1     = 'https://phones-calls.com/state-index/'+states[p]+'?page=' + str(j)
    print(url1)
    response = requests.get(url1)
    html     = response.text
    soup     = BeautifulSoup(html,'html.parser')
    error    = soup.find('h3')
    if error == None :
      data1    = soup.find_all('a', {'class' : ''})
      x        = len(data1)
      for y in range(citystart,x):
        url2 = 'https://phones-calls.com' + data1[y]['href']
        file_list=[]
        for  k in range(1,100):   
                url      = url2 + '?page=' + str(k)
                try:
                  response = requests.get(url)
                except:
                  time.sleep(3)
                  try:
                    response = requests.get(url)
                  except:
                    time.sleep(30)
                    try:
                      response = requests.get(url)
                    except:
                      print('stuuck')
                html     = response.text
                soup     = BeautifulSoup(html,'html.parser')
                error    = soup.find('h3')
                if error == None :
                  data     = soup.find_all('tr')
                  z        = len(soup.find_all('tr'))
                  info2    = soup.find('p').text.strip().split('\n\t\t\t   ')
                  for i in range(1,z) :
                      data_dict    = {}
                      info                  = data[i].find_all('td')
                      data_dict['name']     = info[0].text
                      data_dict['phone']    = info[1].text
                      data_dict['address']  = info[2].text
                      data_dict['city']     = info2[0].split(': ')[1]
                      data_dict['state']    = info2[1].split(': ')[1]
                      data_dict['phn_Code'] = info2[2].split(': ')[1]
                      data_dict['area_code']= info2[2].split(': ')[1].split('-')[0]
                      data_dict['prefix']   = info2[2].split(': ')[1].split('-')[1]
                      data_dict['url']      = url
                      file_list.append(data_dict)
                else :
                  break
        phn_db = pd.DataFrame(file_list)
        phn_db.to_csv(states[p]+str(j)+ '_' +str(y) +'.csv')
      citystart = 0 
    else :
      break
  statestart=1
