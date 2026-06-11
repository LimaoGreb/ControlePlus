import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const MENU_ITEMS = [
  { key:'perfil',   screen:'SettingsPerfil',  icon:'person-outline',        label:'Perfil' },
  { key:'cartoes',  screen:'SettingsCartoes', icon:'card-outline',           label:'Pagamentos' },
  { key:'temas',    screen:'SettingsTemas',   icon:'color-palette-outline',  label:'Temas' },
  { key:'backup',   screen:'SettingsBackup',  icon:'cloud-upload-outline',   label:'Backup' },
  { key:'geral',    screen:'Settings',        icon:'settings-outline',       label:'Configurações' },
];

export default function HeaderMenu() {
  const {colors}=useTheme();
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const [open,setOpen]=useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={()=>setOpen(true)}
        hitSlop={{top:10,bottom:10,left:10,right:10}}
        style={{paddingHorizontal:6}}>
        <Ionicons name="ellipsis-vertical" size={22} color={colors.text}/>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={()=>setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={()=>setOpen(false)}>
          <View style={[styles.dropdown,{backgroundColor:colors.card,borderColor:colors.border,top:insets.top+56}]}>
            {MENU_ITEMS.map((item,i)=>(
              <TouchableOpacity
                key={item.key}
                style={[styles.item,i<MENU_ITEMS.length-1&&{borderBottomWidth:1,borderBottomColor:colors.border}]}
                onPress={()=>{ setOpen(false); navigation.navigate(item.screen); }}>
                <Ionicons name={item.icon} size={18} color={colors.primary}/>
                <Text style={[styles.label,{color:colors.text}]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles=StyleSheet.create({
  dropdown:{
    position:'absolute',right:12,minWidth:190,
    borderWidth:1,borderRadius:14,
    shadowColor:'#000',shadowOffset:{width:0,height:4},
    shadowOpacity:0.18,shadowRadius:10,elevation:10,
    overflow:'hidden',
  },
  item:{flexDirection:'row',alignItems:'center',paddingVertical:13,paddingHorizontal:16,gap:12},
  label:{fontSize:14,fontWeight:'700'},
});
