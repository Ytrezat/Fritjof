# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 17:14:32 2019

@author: Thibault Vieu
"""
import webbrowser

def convert_coord_to_nb(coord):
    return coord[0]*11+coord[1]

def nb_to_coord(c):
    return int(c/11),c-int(c/11)*11

def removecom(variations):
    res = []
    for v in variations:
        res.append(v[0])
    return res

def addnote(variations,i_reader):
    file=open("_tempcom.txt","w")
    if variations[i_reader][0]!=-1:
        file.write(variations[i_reader][2])
    else:
        file.write(variations[i_reader][4])
    file.close()
    webbrowser.open("_tempcom.txt")
    return variations